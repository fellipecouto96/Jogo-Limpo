import { prisma } from '../../shared/database/prisma.js';
import { withPerformanceLog } from '../../shared/logging/performance.service.js';
import { LOG_JOURNEYS } from '../../shared/logging/journeys.js';
import { Decimal } from '@prisma/client/runtime/library';

export interface RecordResultInput {
  winnerId: string;
  player1Score?: number | null;
  player2Score?: number | null;
}

export interface RecordResultResponse {
  matchId: string;
  winnerId: string;
  player1Score: number | null;
  player2Score: number | null;
  roundComplete: boolean;
  tournamentFinished: boolean;
}

export interface UndoLastResultResponse {
  matchId: string;
  winnerId: string;
  roundNumber: number;
  tournamentReopened: boolean;
}

export async function recordMatchResult(
  tournamentId: string,
  matchId: string,
  input: RecordResultInput,
  organizerId: string
): Promise<RecordResultResponse> {
  const { winnerId, player1Score, player2Score } = input;

  return await prisma.$transaction(
    async (tx) => {
      // 1+2. Validate match + tournament in one query
    const match = await withPerformanceLog(
      LOG_JOURNEYS.RECORD_RESULT,
      'match_with_tournament_lookup',
      () =>
        tx.match.findUnique({
          where: { id: matchId },
          select: {
            id: true,
            tournamentId: true,
            roundId: true,
            positionInBracket: true,
            isBye: true,
            winnerId: true,
            player1Id: true,
            player2Id: true,
            round: { select: { roundNumber: true, isRepechage: true } },
            tournament: {
              select: {
                id: true,
                organizerId: true,
                status: true,
                thirdPlacePercentage: true,
                fourthPlacePercentage: true,
              },
            },
          },
        }),
      { tournamentId, matchId }
    );

    if (!match || match.tournamentId !== tournamentId) {
      throw new MatchError('Partida nao encontrada', 404);
    }
    const tournament = match.tournament;
    if (!tournament) {
      throw new MatchError('Torneio nao encontrado', 404);
    }
    if (tournament.organizerId !== organizerId) {
      throw new MatchError('Acesso negado', 403);
    }
    if (tournament.status !== 'RUNNING') {
      throw new MatchError('Torneio nao esta em andamento', 409);
    }

    const nextSlotPosition = Math.ceil(match.positionInBracket / 2);
    const downstreamMatch = await tx.match.findFirst({
      where: {
        tournamentId,
        positionInBracket: nextSlotPosition,
        round: { roundNumber: match.round.roundNumber + 1, isRepechage: false },
      },
      select: { id: true, winnerId: true, player1Id: true, player2Id: true },
    });
    if (match.isBye) {
      throw new MatchError('Partidas com bye nao podem ser editadas', 409);
    }
    if (match.winnerId !== null) {
      throw new MatchError('Resultado ja registrado', 409);
    }
    if (downstreamMatch?.winnerId) {
      throw new MatchError(
        'A proxima rodada ja foi concluida para esta chave',
        409
      );
    }

    // 3. Validate winnerId
    if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
      throw new MatchError('Jogador invalido para esta partida', 400);
    }

    // 4. Validate scores if provided
    const hasScores = player1Score !== null && player1Score !== undefined &&
                      player2Score !== null && player2Score !== undefined;
    
    if (hasScores) {
      if (player1Score < 0 || player2Score < 0) {
        throw new MatchError('Placar nao pode ser negativo', 400);
      }
      if (player1Score === player2Score) {
        throw new MatchError('Placar nao pode ser empate', 400);
      }
      const scoreWinnerId = player1Score > player2Score ? match.player1Id : match.player2Id;
      if (scoreWinnerId !== winnerId) {
        throw new MatchError('Vencedor deve ser o jogador com maior placar', 400);
      }
    }

    // 5. Record result
    const updatedMatch = await tx.match.update({
      where: { id: matchId },
      data: {
        winnerId,
        player1Score: player1Score ?? null,
        player2Score: player2Score ?? null,
        finishedAt: new Date(),
      },
    });

    // 6. Repechage match: reduce to 1 champion via dynamic sub-rounds, then
    // insert into main bracket. Multiple rebuyers → multiple sub-rounds in the
    // same repechage round until only 1 unplaced winner remains.
    if (match.round.isRepechage) {
      // Step A: wait for all paired (both players) repechage matches to finish.
      const anyUnfinishedRepechage = await tx.match.findFirst({
        where: { roundId: match.roundId, winnerId: null, player2Id: { not: null } },
        select: { id: true },
      });

      if (anyUnfinishedRepechage) {
        return {
          matchId,
          winnerId,
          player1Score: updatedMatch.player1Score,
          player2Score: updatedMatch.player2Score,
          roundComplete: false,
          tournamentFinished: false,
        };
      }

      // Step B: auto-BYE any initial unpaired rebuyers (registered without an opponent).
      const unpairedInitial = await tx.match.findMany({
        where: { roundId: match.roundId, player2Id: null, winnerId: null },
        select: { id: true, player1Id: true },
      });
      for (const u of unpairedInitial) {
        await tx.match.update({
          where: { id: u.id },
          data: { winnerId: u.player1Id, isBye: true, finishedAt: new Date() },
        });
      }

      // Step C: compute unplaced winners across all repechage sub-rounds.
      const allRepMatches = await tx.match.findMany({
        where: { roundId: match.roundId },
        select: { id: true, player1Id: true, player2Id: true, winnerId: true, isBye: true },
      });
      const unplaced = getUnplacedRepechageWinners(allRepMatches);

      // Step D: if 2+ unplaced → pair them in a new sub-round (same roundId).
      if (unplaced.length >= 2) {
        const posAgg = await tx.match.aggregate({
          where: { roundId: match.roundId },
          _max: { positionInBracket: true },
        });
        let nextPos = (posAgg._max.positionInBracket ?? 0) + 1;
        const subMatches: {
          tournamentId: string;
          roundId: string;
          player1Id: string;
          player2Id?: string | null;
          winnerId?: string;
          isBye?: boolean;
          positionInBracket: number;
          finishedAt?: Date;
        }[] = [];

        for (let i = 0; i + 1 < unplaced.length; i += 2) {
          subMatches.push({
            tournamentId,
            roundId: match.roundId,
            player1Id: unplaced[i],
            player2Id: unplaced[i + 1],
            positionInBracket: nextPos++,
          });
        }
        // Odd winner: auto-BYE straight into the next sub-round.
        if (unplaced.length % 2 === 1) {
          const odd = unplaced[unplaced.length - 1];
          subMatches.push({
            tournamentId,
            roundId: match.roundId,
            player1Id: odd,
            player2Id: null,
            winnerId: odd,
            isBye: true,
            positionInBracket: nextPos++,
            finishedAt: new Date(),
          });
        }
        await tx.match.createMany({ data: subMatches });
        return {
          matchId,
          winnerId,
          player1Score: updatedMatch.player1Score,
          player2Score: updatedMatch.player2Score,
          roundComplete: false,
          tournamentFinished: false,
        };
      }

      // Step E: exactly 1 unplaced winner → insert into main bracket.
      const champion = unplaced[0];
      if (champion) {
        await placeRepechageChampionInRound2(tx, tournamentId, champion);
      }

      return {
        matchId,
        winnerId,
        player1Score: updatedMatch.player1Score,
        player2Score: updatedMatch.player2Score,
        roundComplete: true,
        tournamentFinished: false,
      };
    }

    // 6. Round complete (non-repechage) — short-circuit on first unfinished match
    const anyUnfinished = await tx.match.findFirst({
      where: { roundId: match.roundId, winnerId: null },
      select: { id: true },
    });

    if (anyUnfinished) {
      return {
        matchId,
        winnerId,
        player1Score: updatedMatch.player1Score,
        player2Score: updatedMatch.player2Score,
        roundComplete: false,
        tournamentFinished: false,
      };
    }

    // 7. Fetch next main bracket round, current round matches, and total rounds in parallel.
    // Exclude repechage rounds from nextRound and totalRounds so the bracket
    // advances correctly even when a repechage round exists.
    const [nextRound, completedMatchesForRound, totalRounds] = await Promise.all([
      tx.round.findFirst({
        where: {
          tournamentId,
          roundNumber: match.round.roundNumber + 1,
          isRepechage: false,
        },
        include: {
          matches: {
            select: { id: true, winnerId: true, player1Id: true, player2Id: true },
          },
        },
      }),
      tx.match.findMany({
        where: { roundId: match.roundId },
        orderBy: { positionInBracket: 'asc' },
      }),
      tx.round.count({ where: { tournamentId, isRepechage: false } }),
    ]);

    if (!nextRound) {
      // Championship is always match position 1 in the last round.
      const finalRoundMatches = completedMatchesForRound;
      const championshipMatch =
        finalRoundMatches.find((m) => m.positionInBracket === 1) ?? null;
      const championId = championshipMatch?.winnerId ?? winnerId;
      const runnerUpId = championshipMatch
        ? championshipMatch.player1Id === championshipMatch.winnerId
          ? championshipMatch.player2Id
          : championshipMatch.player1Id
        : match.player1Id === winnerId
          ? match.player2Id
          : match.player1Id;
      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'FINISHED',
          finishedAt: new Date(),
          championId,
          runnerUpId,
        },
      });

      return {
        matchId,
        winnerId,
        player1Score: updatedMatch.player1Score,
        player2Score: updatedMatch.player2Score,
        roundComplete: true,
        tournamentFinished: true,
      };
    }

    // 8. Create next round matches from winners
    if (nextRound.matches.length > 0) {
      const hasProgress = nextRound.matches.some(
        (m) => m.player1Id !== null || m.player2Id !== null || m.winnerId !== null
      );
      if (hasProgress) {
        throw new MatchError(
          'Proxima rodada ja foi iniciada. Resultados nao podem ser duplicados.',
          409
        );
      }
    }

    const completedMatches = completedMatchesForRound;
    const nextRoundIsChampionshipRound = nextRound.roundNumber === totalRounds;
    const currentRoundIsSemifinal = match.round.roundNumber === totalRounds - 1;
    const thirdPlaceEnabled =
      decimalToNumber(tournament.thirdPlacePercentage) > 0 ||
      decimalToNumber(tournament.fourthPlacePercentage) > 0;

    // Use only non-BYE semis for 3rd/4th determination. This handles the case
    // where a repechage champion got a BYE through the semi-final.
    const realSemis = completedMatches.filter((m) => !m.isBye && m.player2Id !== null);

    if (
      thirdPlaceEnabled &&
      currentRoundIsSemifinal &&
      nextRoundIsChampionshipRound &&
      realSemis.length >= 2
    ) {
      // Use the last two real (non-BYE) semis to determine finalists and 3rd/4th.
      const semifinalA = realSemis[realSemis.length - 2];
      const semifinalB = realSemis[realSemis.length - 1];
      const semifinalALoserId = getMatchLoserId(semifinalA);
      const semifinalBLoserId = getMatchLoserId(semifinalB);

      const finalAndThirdPlaceMatches = [
        {
          tournamentId,
          roundId: nextRound.id,
          player1Id: semifinalA.winnerId!,
          player2Id: semifinalB.winnerId!,
          positionInBracket: 1,
        },
      ];

      if (semifinalALoserId && semifinalBLoserId) {
        finalAndThirdPlaceMatches.push({
          tournamentId,
          roundId: nextRound.id,
          player1Id: semifinalALoserId,
          player2Id: semifinalBLoserId,
          positionInBracket: 2,
        });
      }

      await tx.match.createMany({ data: finalAndThirdPlaceMatches });

      return {
        matchId,
        winnerId,
        player1Score: updatedMatch.player1Score,
        player2Score: updatedMatch.player2Score,
        roundComplete: true,
        tournamentFinished: false,
      };
    }

    const nextMatches = [];
    for (let i = 0; i < completedMatches.length; i += 2) {
      const positionInBracket = Math.floor(i / 2) + 1;
      const player1Id = completedMatches[i].winnerId!;

      if (i + 1 < completedMatches.length) {
        nextMatches.push({
          tournamentId,
          roundId: nextRound.id,
          player1Id,
          player2Id: completedMatches[i + 1].winnerId!,
          positionInBracket,
        });
      } else {
        nextMatches.push({
          tournamentId,
          roundId: nextRound.id,
          player1Id,
          player2Id: null,
          winnerId: player1Id,
          isBye: true,
          positionInBracket,
          finishedAt: new Date(),
        });
      }
    }

    await tx.match.createMany({ data: nextMatches });

    // If we just created Round 2 (nextRound.roundNumber === 2), check whether
    // the repechage champion was determined while Round 1 was still in progress
    // (i.e., champion is waiting to be placed because Round 2 didn't exist yet).
    if (nextRound.roundNumber === 2) {
      const repechageRound = await tx.round.findFirst({
        where: { tournamentId, isRepechage: true },
        select: { id: true },
      });
      if (repechageRound) {
        const allRepMatches = await tx.match.findMany({
          where: { roundId: repechageRound.id },
          select: { id: true, player1Id: true, player2Id: true, winnerId: true, isBye: true },
        });
        const unplaced = getUnplacedRepechageWinners(allRepMatches);
        if (unplaced.length === 1) {
          await placeRepechageChampionInRound2(tx, tournamentId, unplaced[0]);
        }
      }
    }

    return {
      matchId,
      winnerId,
      player1Score: updatedMatch.player1Score,
      player2Score: updatedMatch.player2Score,
      roundComplete: true,
      tournamentFinished: false,
    };
  },
  { timeout: 30000 }
  );
}

export async function undoLastMatchResult(
  tournamentId: string,
  organizerId: string
): Promise<UndoLastResultResponse> {
  return await prisma.$transaction(async (tx) => {
    const tournament = await withPerformanceLog(
      LOG_JOURNEYS.RECORD_RESULT,
      'undo_tournament_lookup',
      () =>
        tx.tournament.findUnique({
          where: { id: tournamentId },
          select: {
            id: true,
            organizerId: true,
            status: true,
          },
        }),
      { tournamentId }
    );

    if (!tournament) {
      throw new MatchError('Torneio nao encontrado', 404);
    }
    if (tournament.organizerId !== organizerId) {
      throw new MatchError('Acesso negado', 403);
    }
    if (tournament.status !== 'RUNNING' && tournament.status !== 'FINISHED') {
      throw new MatchError('Torneio nao esta em andamento', 409);
    }

    const latestMatch = await withPerformanceLog(
      LOG_JOURNEYS.RECORD_RESULT,
      'undo_latest_match_lookup',
      () =>
        tx.match.findFirst({
          where: {
            tournamentId,
            winnerId: { not: null },
            isBye: false,
          },
          select: {
            id: true,
            winnerId: true,
            roundId: true,
            round: { select: { roundNumber: true } },
          },
          orderBy: [{ finishedAt: 'desc' }, { createdAt: 'desc' }],
        }),
      { tournamentId }
    );

    if (!latestMatch || !latestMatch.winnerId) {
      throw new MatchError('Nenhum resultado para desfazer', 409);
    }

    const nextRound = await tx.round.findFirst({
      where: {
        tournamentId,
        roundNumber: latestMatch.round.roundNumber + 1,
        isRepechage: false,
      },
      include: {
        matches: {
          select: {
            id: true,
            winnerId: true,
            isBye: true,
          },
        },
      },
    });

    if (nextRound) {
      const hasResolvedMatch = nextRound.matches.some(
        (nextMatch) => nextMatch.winnerId !== null && !nextMatch.isBye
      );
      if (hasResolvedMatch) {
        throw new MatchError(
          'Nao e possivel desfazer: ja existem resultados na rodada seguinte',
          409
        );
      }

      if (nextRound.matches.length > 0) {
        await tx.match.deleteMany({
          where: { roundId: nextRound.id },
        });
      }
    }

    const tournamentReopened = tournament.status === 'FINISHED';
    if (tournamentReopened) {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'RUNNING',
          finishedAt: null,
          championId: null,
          runnerUpId: null,
        },
      });
    }

    await tx.match.update({
      where: { id: latestMatch.id },
      data: {
        winnerId: null,
        finishedAt: null,
      },
    });

    return {
      matchId: latestMatch.id,
      winnerId: latestMatch.winnerId,
      roundNumber: latestMatch.round.roundNumber,
      tournamentReopened,
    };
  },
  { timeout: 30000 }
  );
}

export interface UpdateScoreInput {
  player1Score: number;
  player2Score: number;
}

export async function updateMatchScore(
  tournamentId: string,
  matchId: string,
  input: UpdateScoreInput,
  organizerId: string
): Promise<{ matchId: string; player1Score: number; player2Score: number }> {
  const { player1Score, player2Score } = input;

  const tournament = await withPerformanceLog(
    LOG_JOURNEYS.RECORD_RESULT,
    'update_score_tournament_lookup',
    () =>
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: {
          organizerId: true,
          status: true,
        },
      }),
    { tournamentId }
  );

  if (!tournament) {
    throw new MatchError('Torneio nao encontrado', 404);
  }
  if (tournament.organizerId !== organizerId) {
    throw new MatchError('Acesso negado', 403);
  }
  if (tournament.status === 'FINISHED') {
    throw new MatchError('Torneio ja finalizado, nao e possivel editar placares', 409);
  }

  const match = await withPerformanceLog(
    LOG_JOURNEYS.RECORD_RESULT,
    'update_score_match_lookup',
    () =>
      prisma.match.findUnique({
        where: { id: matchId },
        select: {
          id: true,
          tournamentId: true,
          isBye: true,
          winnerId: true,
          player1Id: true,
          player2Id: true,
        },
      }),
    { tournamentId, matchId }
  );

  if (!match || match.tournamentId !== tournamentId) {
    throw new MatchError('Partida nao encontrada', 404);
  }
  if (match.isBye) {
    throw new MatchError('Partidas com bye nao possuem placar', 409);
  }
  if (!match.winnerId) {
    throw new MatchError('Partida ainda nao tem vencedor', 409);
  }

  if (player1Score < 0 || player2Score < 0) {
    throw new MatchError('Placar nao pode ser negativo', 400);
  }
  if (player1Score === player2Score) {
    throw new MatchError('Placar nao pode ser empate', 400);
  }

  const scoreWinnerId = player1Score > player2Score ? match.player1Id : match.player2Id;
  if (scoreWinnerId !== match.winnerId) {
    throw new MatchError('Placar deve corresponder ao vencedor atual', 400);
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { player1Score, player2Score },
  });

  return { matchId, player1Score, player2Score };
}

export interface TournamentStatistics {
  totalMatches: number;
  completedMatches: number;
  totalGames: number;
  highestScoringPlayer: { id: string; name: string; totalScore: number } | null;
  biggestWinMargin: { matchId: string; margin: number; winner: string; loser: string } | null;
  averageScorePerMatch: number;
  finalScore: { player1: string; player2: string; score1: number; score2: number } | null;
  playerCount: number;
}

export async function getTournamentStatistics(
  tournamentId: string
): Promise<TournamentStatistics> {
  const tournament = await withPerformanceLog(
    LOG_JOURNEYS.PUBLIC_PAGE,
    'tournament_statistics',
    () =>
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: {
          matches: {
            where: { isBye: false },
            select: {
              id: true,
              roundId: true,
              positionInBracket: true,
              winnerId: true,
              player1Id: true,
              player2Id: true,
              player1Score: true,
              player2Score: true,
              player1: {
                select: {
                  name: true,
                },
              },
              player2: {
                select: {
                  name: true,
                },
              },
            },
          },
          rounds: {
            orderBy: { roundNumber: 'desc' },
            take: 1,
            select: {
              id: true,
            },
          },
        },
      }),
    { tournamentId }
  );

  if (!tournament) {
    throw new MatchError('Torneio nao encontrado', 404);
  }

  const matches = tournament.matches;
  const completedMatches = matches.filter((m) => m.winnerId !== null);
  const matchesWithScores = completedMatches.filter(
    (m) => m.player1Score !== null && m.player2Score !== null
  );

  const totalGames = matchesWithScores.reduce(
    (sum, m) => sum + (m.player1Score ?? 0) + (m.player2Score ?? 0),
    0
  );

  const playerScores = new Map<string, { name: string; totalScore: number }>();
  for (const match of matchesWithScores) {
    const p1 = playerScores.get(match.player1Id) ?? { name: match.player1.name, totalScore: 0 };
    p1.totalScore += match.player1Score ?? 0;
    playerScores.set(match.player1Id, p1);

    if (match.player2) {
      const p2 = playerScores.get(match.player2Id!) ?? { name: match.player2.name, totalScore: 0 };
      p2.totalScore += match.player2Score ?? 0;
      playerScores.set(match.player2Id!, p2);
    }
  }

  let highestScoringPlayer: TournamentStatistics['highestScoringPlayer'] = null;
  for (const [id, data] of playerScores) {
    if (!highestScoringPlayer || data.totalScore > highestScoringPlayer.totalScore) {
      highestScoringPlayer = { id, name: data.name, totalScore: data.totalScore };
    }
  }

  let biggestWinMargin: TournamentStatistics['biggestWinMargin'] = null;
  for (const match of matchesWithScores) {
    if (match.player1Score !== null && match.player2Score !== null && match.player2) {
      const margin = Math.abs(match.player1Score - match.player2Score);
      if (!biggestWinMargin || margin > biggestWinMargin.margin) {
        const isP1Winner = match.player1Score > match.player2Score;
        biggestWinMargin = {
          matchId: match.id,
          margin,
          winner: isP1Winner ? match.player1.name : match.player2.name,
          loser: isP1Winner ? match.player2.name : match.player1.name,
        };
      }
    }
  }

  const averageScorePerMatch =
    matchesWithScores.length > 0
      ? totalGames / matchesWithScores.length
      : 0;

  let finalScore: TournamentStatistics['finalScore'] = null;
  if (tournament.rounds.length > 0) {
    const finalRound = tournament.rounds[0];
    const finalMatch = matches.find(
      (m) =>
        m.roundId === finalRound.id &&
        m.winnerId !== null &&
        m.player2 !== null &&
        m.positionInBracket === 1
    );
    if (finalMatch && finalMatch.player1Score !== null && finalMatch.player2Score !== null) {
      finalScore = {
        player1: finalMatch.player1.name,
        player2: finalMatch.player2!.name,
        score1: finalMatch.player1Score,
        score2: finalMatch.player2Score,
      };
    }
  }

  const uniquePlayers = new Set<string>();
  for (const match of matches) {
    uniquePlayers.add(match.player1Id);
    if (match.player2Id) {
      uniquePlayers.add(match.player2Id);
    }
  }

  return {
    totalMatches: matches.length,
    completedMatches: completedMatches.length,
    totalGames,
    highestScoringPlayer,
    biggestWinMargin,
    averageScorePerMatch: Math.round(averageScorePerMatch * 10) / 10,
    finalScore,
    playerCount: uniquePlayers.size,
  };
}

export class MatchError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'MatchError';
  }
}

function decimalToNumber(value: Decimal | null | undefined): number {
  if (!value) return 0;
  return value.toNumber();
}

function getMatchLoserId(match: {
  winnerId: string | null;
  player1Id: string;
  player2Id: string | null;
}): string | null {
  if (!match.winnerId || !match.player2Id) return null;
  return match.winnerId === match.player1Id ? match.player2Id : match.player1Id;
}

/**
 * Returns the set of repechage winners who have NOT yet been placed in a
 * subsequent match (as a player where they are not the winner). This detects
 * which winners still need to be paired in the next sub-round or inserted
 * into the main bracket.
 */
function getUnplacedRepechageWinners(
  matches: { id: string; player1Id: string; player2Id: string | null; winnerId: string | null; isBye: boolean }[]
): string[] {
  const uniqueWinners = new Set<string>();
  for (const m of matches) {
    if (m.winnerId) uniqueWinners.add(m.winnerId);
  }

  const unplaced: string[] = [];
  for (const w of uniqueWinners) {
    // A winner is "placed" if they appear as a player in ANY match where
    // they are NOT the winner (i.e., they'll play or already lost).
    const isPlaced = matches.some(
      (other) => (other.player1Id === w || other.player2Id === w) && other.winnerId !== w
    );
    if (!isPlaced) {
      unplaced.push(w);
    }
  }
  return unplaced;
}

/**
 * Places the repechage champion into Round 2 of the main bracket.
 * - If an open slot exists (player2Id: null, winnerId: null), fill it.
 * - Otherwise, create a BYE match so the champion auto-advances to Round 3.
 */
async function placeRepechageChampionInRound2(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  tournamentId: string,
  champion: string
): Promise<void> {
  const round2 = await tx.round.findFirst({
    where: { tournamentId, roundNumber: 2, isRepechage: false },
    select: { id: true },
  });
  if (!round2) return;

  const openSlot = await tx.match.findFirst({
    where: { roundId: round2.id, player2Id: null, winnerId: null },
    orderBy: { positionInBracket: 'asc' },
    select: { id: true },
  });

  if (openSlot) {
    await tx.match.update({ where: { id: openSlot.id }, data: { player2Id: champion } });
  } else {
    // Round 2 is fully paired — give champion a BYE so they advance to Round 3.
    const posAgg = await tx.match.aggregate({
      where: { roundId: round2.id },
      _max: { positionInBracket: true },
    });
    await tx.match.create({
      data: {
        tournamentId,
        roundId: round2.id,
        player1Id: champion,
        player2Id: null,
        winnerId: champion,
        isBye: true,
        positionInBracket: (posAgg._max.positionInBracket ?? 0) + 1,
        finishedAt: new Date(),
      },
    });
  }
}
