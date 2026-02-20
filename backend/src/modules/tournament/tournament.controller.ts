import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  listTournaments,
  getTournamentById,
  updateTournamentFinancials,
  finishTournament,
  renameTournamentPlayer,
  TournamentError,
} from './tournament.service.js';
import { logEvent } from '../../shared/logging/log.service.js';
import { LOG_JOURNEYS } from '../../shared/logging/journeys.js';

export async function getTournaments(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const organizerId = request.user.sub;
    const page = request.query.page ? Number(request.query.page) : 1;
    const limit = request.query.limit ? Number(request.query.limit) : 20;
    const tournaments = await listTournaments(organizerId, page, limit);
    return reply.send(tournaments);
  } catch (err) {
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.TOURNAMENT_LIST,
      userId: request.user.sub,
      message: 'Failed to list tournaments',
      metadata: {
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}

interface TournamentParams {
  tournamentId: string;
}

export async function getTournament(
  request: FastifyRequest<{ Params: TournamentParams }>,
  reply: FastifyReply
) {
  try {
    const { tournamentId } = request.params;
    const organizerId = request.user.sub;
    const tournament = await getTournamentById(tournamentId, organizerId);
    return reply.send(tournament);
  } catch (err) {
    if (err instanceof TournamentError) {
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.TOURNAMENT_DETAIL,
        tournamentId: request.params.tournamentId,
        userId: request.user.sub,
        message: err.message,
        metadata: { statusCode: err.statusCode },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.TOURNAMENT_DETAIL,
      tournamentId: request.params.tournamentId,
      userId: request.user.sub,
      message: 'Unexpected tournament detail error',
      metadata: {
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}

interface FinancialsBody {
  entryFee: number;
  organizerPercentage: number;
  championPercentage?: number;
  runnerUpPercentage?: number;
  thirdPlacePercentage?: number | null;
  firstPlacePercentage?: number;
  secondPlacePercentage?: number;
}

export async function patchTournamentFinancials(
  request: FastifyRequest<{ Params: TournamentParams; Body: FinancialsBody }>,
  reply: FastifyReply
) {
  try {
    const { tournamentId } = request.params;
    const organizerId = request.user.sub;
    const {
      entryFee,
      organizerPercentage,
      championPercentage,
      runnerUpPercentage,
      thirdPlacePercentage,
      firstPlacePercentage,
      secondPlacePercentage,
    } = request.body;

    const championInput = championPercentage ?? firstPlacePercentage;
    const runnerUpInput = runnerUpPercentage ?? secondPlacePercentage;

    if (typeof entryFee !== 'number' || typeof organizerPercentage !== 'number') {
      return reply.status(400).send({ error: 'Taxa e percentual do organizador sao obrigatorios' });
    }
    if (typeof championInput !== 'number' || typeof runnerUpInput !== 'number') {
      return reply
        .status(400)
        .send({ error: 'Percentuais de campeao e vice sao obrigatorios' });
    }
    if (
      thirdPlacePercentage != null &&
      typeof thirdPlacePercentage !== 'number'
    ) {
      return reply
        .status(400)
        .send({ error: 'Percentual de terceiro lugar invalido' });
    }

    const result = await updateTournamentFinancials(tournamentId, organizerId, {
      entryFee,
      organizerPercentage,
      championPercentage,
      runnerUpPercentage,
      thirdPlacePercentage,
      firstPlacePercentage,
      secondPlacePercentage,
    });

    return reply.send(result);
  } catch (err) {
    if (err instanceof TournamentError) {
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.TOURNAMENT_FINANCIALS,
        tournamentId: request.params.tournamentId,
        userId: request.user.sub,
        message: err.message,
        metadata: { statusCode: err.statusCode },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.TOURNAMENT_FINANCIALS,
      tournamentId: request.params.tournamentId,
      userId: request.user.sub,
      message: 'Unexpected tournament financials error',
      metadata: {
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}

export async function patchTournamentFinish(
  request: FastifyRequest<{ Params: TournamentParams }>,
  reply: FastifyReply
) {
  try {
    const { tournamentId } = request.params;
    const organizerId = request.user.sub;
    const result = await finishTournament(tournamentId, organizerId);
    return reply.send(result);
  } catch (err) {
    if (err instanceof TournamentError) {
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.TOURNAMENT_FINISH,
        tournamentId: request.params.tournamentId,
        userId: request.user.sub,
        message: err.message,
        metadata: { statusCode: err.statusCode },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.TOURNAMENT_FINISH,
      tournamentId: request.params.tournamentId,
      userId: request.user.sub,
      message: 'Unexpected tournament finish error',
      metadata: {
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}

interface TournamentPlayerParams extends TournamentParams {
  playerId: string;
}

interface RenamePlayerBody {
  name: string;
}

export async function patchTournamentPlayer(
  request: FastifyRequest<{
    Params: TournamentPlayerParams;
    Body: RenamePlayerBody;
  }>,
  reply: FastifyReply
) {
  try {
    const { tournamentId, playerId } = request.params;
    const organizerId = request.user.sub;
    const { name } = request.body;

    if (typeof name !== 'string') {
      return reply.status(400).send({ error: 'Nome do jogador e obrigatorio' });
    }

    const result = await renameTournamentPlayer(
      tournamentId,
      organizerId,
      playerId,
      name
    );

    return reply.send(result);
  } catch (err) {
    if (err instanceof TournamentError) {
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.TOURNAMENT_PLAYER,
        tournamentId: request.params.tournamentId,
        userId: request.user.sub,
        message: err.message,
        metadata: { statusCode: err.statusCode, playerId: request.params.playerId },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.TOURNAMENT_PLAYER,
      tournamentId: request.params.tournamentId,
      userId: request.user.sub,
      message: 'Unexpected player update error',
      metadata: {
        playerId: request.params.playerId,
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}
