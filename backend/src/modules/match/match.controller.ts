import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  recordMatchResult,
  undoLastMatchResult,
  MatchError,
} from './match.service.js';

interface MatchParams {
  tournamentId: string;
  matchId: string;
}

interface MatchBody {
  winnerId: string;
}

export async function updateMatchResult(
  request: FastifyRequest<{ Params: MatchParams; Body: MatchBody }>,
  reply: FastifyReply
) {
  try {
    const { tournamentId, matchId } = request.params;
    const { winnerId } = request.body;
    const organizerId = request.user.sub;

    if (!winnerId || typeof winnerId !== 'string') {
      return reply.status(400).send({ error: 'winnerId is required' });
    }

    const result = await recordMatchResult(
      tournamentId,
      matchId,
      winnerId,
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
