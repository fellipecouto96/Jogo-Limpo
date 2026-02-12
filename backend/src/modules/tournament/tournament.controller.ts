import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  listTournaments,
  getTournamentById,
  updateTournamentFinancials,
  TournamentError,
} from './tournament.service.js';

export async function getTournaments(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const organizerId = request.user.sub;
  const tournaments = await listTournaments(organizerId);
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
  firstPlacePercentage: number;
  secondPlacePercentage: number;
}

export async function patchTournamentFinancials(
  request: FastifyRequest<{ Params: TournamentParams; Body: FinancialsBody }>,
  reply: FastifyReply
) {
  try {
    const { tournamentId } = request.params;
    const organizerId = request.user.sub;
    const { entryFee, organizerPercentage, firstPlacePercentage, secondPlacePercentage } =
      request.body;

    if (
      typeof entryFee !== 'number' ||
      typeof organizerPercentage !== 'number' ||
      typeof firstPlacePercentage !== 'number' ||
      typeof secondPlacePercentage !== 'number'
    ) {
      return reply.status(400).send({ error: 'Todos os campos financeiros sao obrigatorios' });
    }

    const result = await updateTournamentFinancials(tournamentId, organizerId, {
      entryFee,
      organizerPercentage,
      firstPlacePercentage,
      secondPlacePercentage,
    });

    return reply.send(result);
  } catch (err) {
    if (err instanceof TournamentError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
