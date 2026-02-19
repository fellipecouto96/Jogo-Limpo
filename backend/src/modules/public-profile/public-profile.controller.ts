import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  getPublicProfile,
  getPublicTournamentDetail,
} from './public-profile.service.js';

interface ProfileParams {
  slug: string;
}

interface TournamentParams {
  slug: string;
  tournamentId: string;
}

export async function getProfile(
  request: FastifyRequest<{ Params: ProfileParams }>,
  reply: FastifyReply
) {
  const profile = await getPublicProfile(request.params.slug);
  if (!profile) {
    return reply.status(404).send({ error: 'Perfil nao encontrado' });
  }
  return reply.send(profile);
}

export async function getTournamentDetail(
  request: FastifyRequest<{ Params: TournamentParams }>,
  reply: FastifyReply
) {
  const detail = await getPublicTournamentDetail(
    request.params.slug,
    request.params.tournamentId
  );
  if (!detail) {
    return reply.status(404).send({ error: 'Torneio nao encontrado' });
  }
  return reply.send(detail);
}
