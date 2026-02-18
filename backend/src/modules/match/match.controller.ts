import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  recordMatchResult,
  undoLastMatchResult,
  updateMatchScore,
  getTournamentStatistics,
  MatchError,
} from './match.service.js';

interface MatchParams {
  tournamentId: string;
  matchId: string;
}

interface MatchBody {
  winnerId: string;
  player1Score?: number | null;
  player2Score?: number | null;
}

interface ScoreBody {
  player1Score: number;
  player2Score: number;
}

export async function updateMatchResult(
  request: FastifyRequest<{ Params: MatchParams; Body: MatchBody }>,
  reply: FastifyReply
) {
  try {
    const { tournamentId, matchId } = request.params;
    const { winnerId, player1Score, player2Score } = request.body;
    const organizerId = request.user.sub;

    if (!winnerId || typeof winnerId !== 'string') {
      return reply.status(400).send({ error: 'winnerId is required' });
    }

    const result = await recordMatchResult(
      tournamentId,
      matchId,
      { winnerId, player1Score, player2Score },
      organizerId
    );

    return reply.send(result);
  } catch (err) {
    if (err instanceof MatchError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}

export async function patchMatchScore(
  request: FastifyRequest<{ Params: MatchParams; Body: ScoreBody }>,
  reply: FastifyReply
) {
  try {
    const { tournamentId, matchId } = request.params;
    const { player1Score, player2Score } = request.body;
    const organizerId = request.user.sub;

    if (typeof player1Score !== 'number' || typeof player2Score !== 'number') {
      return reply.status(400).send({ error: 'player1Score and player2Score are required' });
    }

    const result = await updateMatchScore(
      tournamentId,
      matchId,
      { player1Score, player2Score },
      organizerId
    );

    return reply.send(result);
  } catch (err) {
    if (err instanceof MatchError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}

export async function getStatistics(
  request: FastifyRequest<{ Params: { tournamentId: string } }>,
  reply: FastifyReply
) {
  try {
    const { tournamentId } = request.params;
    const stats = await getTournamentStatistics(tournamentId);
    return reply.send(stats);
  } catch (err) {
    if (err instanceof MatchError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}

export async function postUndoLastMatchResult(
  request: FastifyRequest<{ Params: { tournamentId: string } }>,
  reply: FastifyReply
) {
  try {
    const { tournamentId } = request.params;
    const organizerId = request.user.sub;
    const result = await undoLastMatchResult(tournamentId, organizerId);
    return reply.send(result);
  } catch (err) {
    if (err instanceof MatchError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
