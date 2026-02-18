import { prisma } from '../../shared/database/prisma.js';

export interface RecordResultResponse {
  matchId: string;
  winnerId: string;
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
  winnerId: string,
  organizerId: string
): Promise<RecordResultResponse> {
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

    // 4. Record result
    await tx.match.update({
      where: { id: matchId },
      data: { winnerId, finishedAt: new Date() },
    });

    // 5. Check if round is complete
    const unfinished = await tx.match.count({
      where: { roundId: match.roundId, winnerId: null },
    });

    if (unfinished > 0) {
      return {
        matchId,
        winnerId,
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
        roundComplete: true,
        tournamentFinished: true,
      };
    }

    // 7. Create next round matches from winners
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

export class MatchError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'MatchError';
  }
}
