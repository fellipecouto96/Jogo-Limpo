import type { FastifyReply, FastifyRequest } from 'fastify';
import { generateDraw, DrawError } from './draw.service.js';

interface DrawParams {
  tournamentId: string;
}

interface DrawBody {
  playerIds: string[];
}

export async function createDraw(
  request: FastifyRequest<{ Params: DrawParams; Body: DrawBody }>,
  reply: FastifyReply
) {
  try {
    const { tournamentId } = request.params;
    const { playerIds } = request.body;

    if (!Array.isArray(playerIds)) {
      return reply.status(400).send({ error: 'playerIds must be an array' });
    }

    const result = await generateDraw(tournamentId, playerIds);
    return reply.status(201).send(result);
  } catch (err) {
    if (err instanceof DrawError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
