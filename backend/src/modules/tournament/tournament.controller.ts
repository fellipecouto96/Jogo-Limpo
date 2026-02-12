import type { FastifyReply, FastifyRequest } from 'fastify';
import { listTournaments } from './tournament.service.js';

export async function getTournaments(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const organizerId = request.user.sub;
  const tournaments = await listTournaments(organizerId);
  return reply.send(tournaments);
}
