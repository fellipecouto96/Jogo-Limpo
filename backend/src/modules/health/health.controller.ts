import type { FastifyReply, FastifyRequest } from 'fastify';
import { getHealthStatus } from './health.service.js';

export async function healthCheck(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const status = getHealthStatus();
  return reply.send(status);
}
