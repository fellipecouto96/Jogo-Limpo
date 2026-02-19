import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  getPublicProfile,
  getPublicTournamentBySlug,
  getPublicTournamentDetail,
} from './public-profile.service.js';

interface ProfileParams {
  slug: string;
}

interface TournamentParams {
  slug: string;
  tournamentId: string;
}

interface TournamentSlugParams {
  tournamentSlug: string;
}

export async function getProfile(
  request: FastifyRequest<{
    Params: ProfileParams;
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
    };
  }>,
  reply: FastifyReply
) {
  reply.header(
    'Cache-Control',
    'public, max-age=30, s-maxage=60, stale-while-revalidate=120'
  );
  const page = request.query.page ? Number(request.query.page) : 1;
  const limit = request.query.limit ? Number(request.query.limit) : 8;
  const statusRaw = request.query.status;
  const status =
    statusRaw === 'RUNNING' || statusRaw === 'FINISHED'
      ? statusRaw
      : undefined;

  const profile = await getPublicProfile(
    request.params.slug,
    page,
    limit,
    status
  );
  if (!profile) {
    return reply.status(404).send({ error: 'Perfil nao encontrado' });
  }
  return reply.send(profile);
}

export async function getTournamentDetail(
  request: FastifyRequest<{ Params: TournamentParams }>,
  reply: FastifyReply
) {
  reply.header(
    'Cache-Control',
    'public, max-age=20, s-maxage=45, stale-while-revalidate=90'
  );
  const detail = await getPublicTournamentDetail(
    request.params.slug,
    request.params.tournamentId
  );
  if (!detail) {
    return reply.status(404).send({ error: 'Torneio nao encontrado' });
  }
  return reply.send(detail);
}

export async function getTournamentBySlug(
  request: FastifyRequest<{ Params: TournamentSlugParams }>,
  reply: FastifyReply
) {
  reply.header(
    'Cache-Control',
    'public, max-age=20, s-maxage=45, stale-while-revalidate=90'
  );
  const detail = await getPublicTournamentBySlug(request.params.tournamentSlug);
  if (!detail) {
    return reply.status(404).send({ error: 'Torneio nao encontrado' });
  }
  return reply.send(detail);
}
