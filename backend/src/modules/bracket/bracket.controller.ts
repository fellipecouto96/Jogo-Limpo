import type { FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { fetchBracket, BracketError } from './bracket.service.js';
import { logEvent } from '../../shared/logging/log.service.js';
import { LOG_JOURNEYS } from '../../shared/logging/journeys.js';

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
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.BRACKET,
        tournamentId: request.params.tournamentId,
        message: err.message,
        metadata: { statusCode: err.statusCode },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError ||
      err instanceof Prisma.PrismaClientUnknownRequestError ||
      err instanceof Prisma.PrismaClientInitializationError
    ) {
      const code =
        err instanceof Prisma.PrismaClientKnownRequestError ? err.code : 'unknown';
      logEvent({
        level: 'ERROR',
        journey: LOG_JOURNEYS.BRACKET,
        tournamentId: request.params.tournamentId,
        message: 'Prisma database error on bracket fetch',
        metadata: { code, error: err.message.substring(0, 300) },
      });
      return reply
        .status(503)
        .send({ error: 'Servico temporariamente indisponivel. Tente novamente.' });
    }
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.BRACKET,
      tournamentId: request.params.tournamentId,
      message: 'Unexpected bracket error',
      metadata: {
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}
