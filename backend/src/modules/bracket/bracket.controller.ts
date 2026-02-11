import type { FastifyReply, FastifyRequest } from 'fastify';
import { fetchBracket, BracketError } from './bracket.service.js';

interface BracketParams {
  tournamentId: string;
}

export async function getBracket(
  request: FastifyRequest<{ Params: BracketParams }>,
  reply: FastifyReply
) {
  try {
    const { tournamentId } = request.params;
    const result = await fetchBracket(tournamentId);
    return reply.send(result);
  } catch (err) {
    if (err instanceof BracketError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
