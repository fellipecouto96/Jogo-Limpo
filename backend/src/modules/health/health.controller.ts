import type { FastifyReply, FastifyRequest } from 'fastify';
import { getHealthStatus } from './health.service.js';

export async function rootInfo(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  return reply.send({
    name: 'Jogo Limpo API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/health',
      auth: '/auth',
      tournaments: '/tournaments',
      bracket: '/bracket/:tournamentId',
    },
  });
}

export async function healthCheck(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const status = getHealthStatus();
  return reply.send(status);
}
