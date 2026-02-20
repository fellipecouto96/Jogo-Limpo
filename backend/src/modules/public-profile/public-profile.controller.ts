import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  getPublicProfile,
  getPublicTournamentBySlug,
  getPublicTournamentDetail,
} from './public-profile.service.js';
import { logEvent } from '../../shared/logging/log.service.js';
import { LOG_JOURNEYS } from '../../shared/logging/journeys.js';

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
  try {
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
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.PUBLIC_PROFILE,
        message: 'Perfil nao encontrado',
        metadata: { statusCode: 404, slug: request.params.slug },
      });
      return reply.status(404).send({ error: 'Perfil nao encontrado' });
    }
    return reply.send(profile);
  } catch (err) {
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.PUBLIC_PROFILE,
      message: 'Unexpected public profile error',
      metadata: {
        slug: request.params.slug,
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}

export async function getTournamentDetail(
  request: FastifyRequest<{ Params: TournamentParams }>,
  reply: FastifyReply
) {
  try {
    reply.header(
      'Cache-Control',
      'public, max-age=20, s-maxage=45, stale-while-revalidate=90'
    );
    const detail = await getPublicTournamentDetail(
      request.params.slug,
      request.params.tournamentId
    );
    if (!detail) {
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.PUBLIC_TOURNAMENT,
        message: 'Torneio nao encontrado',
        metadata: {
          statusCode: 404,
          slug: request.params.slug,
          tournamentId: request.params.tournamentId,
        },
      });
      return reply.status(404).send({ error: 'Torneio nao encontrado' });
    }
    return reply.send(detail);
  } catch (err) {
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.PUBLIC_TOURNAMENT,
      message: 'Unexpected public tournament detail error',
      metadata: {
        slug: request.params.slug,
        tournamentId: request.params.tournamentId,
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}

export async function getTournamentBySlug(
  request: FastifyRequest<{ Params: TournamentSlugParams }>,
  reply: FastifyReply
) {
  try {
    reply.header(
      'Cache-Control',
      'public, max-age=20, s-maxage=45, stale-while-revalidate=90'
    );
    const detail = await getPublicTournamentBySlug(request.params.tournamentSlug);
    if (!detail) {
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.PUBLIC_TOURNAMENT,
        message: 'Torneio nao encontrado',
        metadata: { statusCode: 404, tournamentSlug: request.params.tournamentSlug },
      });
      return reply.status(404).send({ error: 'Torneio nao encontrado' });
    }
    return reply.send(detail);
  } catch (err) {
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.PUBLIC_TOURNAMENT,
      message: 'Unexpected public tournament slug error',
      metadata: {
        tournamentSlug: request.params.tournamentSlug,
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}
