import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  runOnboardingSetup,
  OnboardingError,
} from './onboarding.service.js';
import { DrawError } from '../draw/draw.service.js';

interface OnboardingBody {
  tournamentName: string;
  playerNames: string[];
  entryFee?: number;
  organizerPercentage?: number;
  championPercentage?: number;
  runnerUpPercentage?: number;
  thirdPlacePercentage?: number | null;
  firstPlacePercentage?: number;
  secondPlacePercentage?: number;
}

export async function setupOnboarding(
  request: FastifyRequest<{ Body: OnboardingBody }>,
  reply: FastifyReply
) {
  try {
    const organizerId = request.user.sub;
    const {
      tournamentName,
      playerNames,
      entryFee,
      organizerPercentage,
      championPercentage,
      runnerUpPercentage,
      thirdPlacePercentage,
      firstPlacePercentage,
      secondPlacePercentage,
    } = request.body;

    if (!Array.isArray(playerNames)) {
      return reply
        .status(400)
        .send({ error: 'Lista de jogadores invalida' });
    }

    const result = await runOnboardingSetup({
      organizerId,
      tournamentName,
      playerNames,
      entryFee,
      organizerPercentage,
      championPercentage,
      runnerUpPercentage,
      thirdPlacePercentage,
      firstPlacePercentage,
      secondPlacePercentage,
    });

    return reply.status(201).send(result);
  } catch (err) {
    if (err instanceof OnboardingError || err instanceof DrawError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
