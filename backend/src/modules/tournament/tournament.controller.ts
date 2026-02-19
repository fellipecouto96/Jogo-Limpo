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

export async function getTournaments(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  const organizerId = request.user.sub;
  const page = request.query.page ? Number(request.query.page) : 1;
  const limit = request.query.limit ? Number(request.query.limit) : 20;
  const tournaments = await listTournaments(organizerId, page, limit);
  return reply.send(tournaments);
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
      return reply.status(err.statusCode).send({ error: err.message });
    }
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
        journey: 'create_tournament',
        tournamentId: request.params.tournamentId,
        userId: request.user.sub,
        message: err.message,
        metadata: { statusCode: err.statusCode },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
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
        journey: 'create_tournament',
        tournamentId: request.params.tournamentId,
        userId: request.user.sub,
        message: err.message,
        metadata: { statusCode: err.statusCode },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
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
        journey: 'create_tournament',
        tournamentId: request.params.tournamentId,
        userId: request.user.sub,
        message: err.message,
        metadata: { statusCode: err.statusCode, playerId: request.params.playerId },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
