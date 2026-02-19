import type { FastifyReply, FastifyRequest } from 'fastify';
import { generateDraw, DrawError } from './draw.service.js';
import { logEvent } from '../../shared/logging/log.service.js';

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
      return reply.status(400).send({ error: 'Lista de jogadores invalida' });
    }

    const result = await generateDraw(tournamentId, playerIds);
    return reply.status(201).send(result);
  } catch (err) {
    if (err instanceof DrawError) {
      logEvent({
        level: 'WARN',
        journey: 'draw',
        tournamentId: request.params.tournamentId,
        message: err.message,
        metadata: { statusCode: err.statusCode },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
