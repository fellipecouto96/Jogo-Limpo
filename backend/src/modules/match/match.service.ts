import { prisma } from '../../shared/database/prisma.js';

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

  return await prisma.$transaction(async (tx) => {
    // 1. Validate tournament
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new MatchError('Torneio nao encontrado', 404);
    }
    if (tournament.organizerId !== organizerId) {
      throw new MatchError('Acesso negado', 403);
    }
    if (tournament.status !== 'RUNNING') {
      throw new MatchError('Torneio nao esta em andamento', 409);
    }

    // 2. Validate match
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { round: true },
    });

    if (!match || match.tournamentId !== tournamentId) {
      throw new MatchError('Partida nao encontrada', 404);
    }
    const nextSlotPosition = Math.ceil(match.positionInBracket / 2);
    const downstreamMatch = await tx.match.findFirst({
      where: {
        tournamentId,
        positionInBracket: nextSlotPosition,
        round: { roundNumber: match.round.roundNumber + 1 },
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

    // 6. Check if round is complete
    const unfinished = await tx.match.count({
      where: { roundId: match.roundId, winnerId: null },
    });

    if (unfinished > 0) {
      return {
        matchId,
        winnerId,
        player1Score: updatedMatch.player1Score,
        player2Score: updatedMatch.player2Score,
        roundComplete: false,
        tournamentFinished: false,
      };
    }

    // 6. Round complete — check for next round
    const nextRound = await tx.round.findUnique({
      where: {
        tournamentId_roundNumber: {
          tournamentId,
          roundNumber: match.round.roundNumber + 1,
        },
      },
      include: {
        matches: {
          select: { id: true, winnerId: true, player1Id: true, player2Id: true },
        },
      },
    });

    if (!nextRound) {
      // Final round complete — finish tournament
      const championId = winnerId;
      const runnerUpId =
        match.player1Id === winnerId ? match.player2Id : match.player1Id;
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

    const completedMatches = await tx.match.findMany({
      where: { roundId: match.roundId },
      orderBy: { positionInBracket: 'asc' },
    });

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

    return {
      matchId,
      winnerId,
      player1Score: updatedMatch.player1Score,
      player2Score: updatedMatch.player2Score,
      roundComplete: true,
      tournamentFinished: false,
    };
  });
}

export async function undoLastMatchResult(
  tournamentId: string,
  organizerId: string
): Promise<UndoLastResultResponse> {
  return await prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new MatchError('Torneio nao encontrado', 404);
    }
    if (tournament.organizerId !== organizerId) {
      throw new MatchError('Acesso negado', 403);
    }
    if (tournament.status !== 'RUNNING' && tournament.status !== 'FINISHED') {
      throw new MatchError('Torneio nao esta em andamento', 409);
    }

    const latestMatch = await tx.match.findFirst({
      where: {
        tournamentId,
        winnerId: { not: null },
        isBye: false,
      },
      include: { round: true },
      orderBy: [{ finishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (!latestMatch || !latestMatch.winnerId) {
      throw new MatchError('Nenhum resultado para desfazer', 409);
    }

    const nextRound = await tx.round.findUnique({
      where: {
        tournamentId_roundNumber: {
          tournamentId,
          roundNumber: latestMatch.round.roundNumber + 1,
        },
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
  });
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

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    throw new MatchError('Torneio nao encontrado', 404);
  }
  if (tournament.organizerId !== organizerId) {
    throw new MatchError('Acesso negado', 403);
  }
  if (tournament.status === 'FINISHED') {
    throw new MatchError('Torneio ja finalizado, nao e possivel editar placares', 409);
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

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
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      matches: {
        where: { isBye: false },
        include: {
          player1: true,
          player2: true,
          winner: true,
          round: true,
        },
      },
      rounds: {
        orderBy: { roundNumber: 'desc' },
        take: 1,
      },
    },
  });

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
      (m) => m.roundId === finalRound.id && m.winnerId !== null && m.player2 !== null
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
