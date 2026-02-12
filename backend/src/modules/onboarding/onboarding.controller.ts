import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  runOnboardingSetup,
  OnboardingError,
} from './onboarding.service.js';
import { DrawError } from '../draw/draw.service.js';

interface OnboardingBody {
  tournamentName: string;
  playerNames: string[];
  prizePool?: number;
}

export async function setupOnboarding(
  request: FastifyRequest<{ Body: OnboardingBody }>,
  reply: FastifyReply
) {
  try {
    const organizerId = request.user.sub;
    const { tournamentName, playerNames, prizePool } = request.body;

    if (!Array.isArray(playerNames)) {
      return reply
        .status(400)
        .send({ error: 'playerNames must be an array' });
    }

    const result = await runOnboardingSetup({
      organizerId,
      tournamentName,
      playerNames,
      prizePool,
    });

    return reply.status(201).send(result);
  } catch (err) {
    if (err instanceof OnboardingError || err instanceof DrawError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
