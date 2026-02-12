import { prisma } from '../../shared/database/prisma.js';

export interface RecordResultResponse {
  matchId: string;
  winnerId: string;
  roundComplete: boolean;
  tournamentFinished: boolean;
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
    if (match.winnerId !== null) {
      throw new MatchError('Resultado ja registrado', 409);
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
    });

    if (!nextRound) {
      // Final round complete — finish tournament
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'FINISHED', finishedAt: new Date() },
      });

      return {
        matchId,
        winnerId,
        roundComplete: true,
        tournamentFinished: true,
      };
    }

    // 7. Create next round matches from winners
    const completedMatches = await tx.match.findMany({
      where: { roundId: match.roundId },
      orderBy: { positionInBracket: 'asc' },
    });

    const nextMatches = [];
    for (let i = 0; i < completedMatches.length; i += 2) {
      nextMatches.push({
        tournamentId,
        roundId: nextRound.id,
        player1Id: completedMatches[i].winnerId!,
        player2Id: completedMatches[i + 1].winnerId!,
        positionInBracket: Math.floor(i / 2) + 1,
      });
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

export class MatchError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'MatchError';
  }
}
