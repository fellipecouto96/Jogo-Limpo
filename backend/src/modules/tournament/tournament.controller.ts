import type { FastifyReply, FastifyRequest } from 'fastify';
import { listTournaments } from './tournament.service.js';

export async function getTournaments(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const tournaments = await listTournaments();
  return reply.send(tournaments);
}
