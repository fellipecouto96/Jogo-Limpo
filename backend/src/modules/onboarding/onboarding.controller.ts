import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  runOnboardingSetup,
  OnboardingError,
} from './onboarding.service.js';
import { DrawError } from '../draw/draw.service.js';

interface OnboardingBody {
  organizerName: string;
  tournamentName: string;
  playerNames: string[];
}

export async function setupOnboarding(
  request: FastifyRequest<{ Body: OnboardingBody }>,
  reply: FastifyReply
) {
  try {
    const { organizerName, tournamentName, playerNames } = request.body;

    if (!Array.isArray(playerNames)) {
      return reply
        .status(400)
        .send({ error: 'playerNames must be an array' });
    }

    const result = await runOnboardingSetup({
      organizerName,
      tournamentName,
      playerNames,
    });

    return reply.status(201).send(result);
  } catch (err) {
    if (err instanceof OnboardingError || err instanceof DrawError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
