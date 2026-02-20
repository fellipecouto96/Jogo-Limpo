import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  runOnboardingSetup,
  OnboardingError,
} from './onboarding.service.js';
import { DrawError } from '../draw/draw.service.js';
import { logEvent } from '../../shared/logging/log.service.js';
import { LOG_JOURNEYS } from '../../shared/logging/journeys.js';

interface OnboardingBody {
  tournamentName: string;
  playerNames: string[];
  entryFee?: number;
  organizerPercentage?: number;
  championPercentage?: number;
  runnerUpPercentage?: number;
  thirdPlacePercentage?: number | null;
  fourthPlacePercentage?: number | null;
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
      fourthPlacePercentage,
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
      fourthPlacePercentage,
      firstPlacePercentage,
      secondPlacePercentage,
    });

    logEvent({
      level: 'INFO',
      journey: LOG_JOURNEYS.ONBOARDING,
      userId: organizerId,
      tournamentId: result.tournamentId,
      message: 'Onboarding setup completed',
      metadata: {
        playerCount: playerNames.length,
        hasThirdPlace: thirdPlacePercentage != null && thirdPlacePercentage > 0,
        hasFourthPlace: fourthPlacePercentage != null && fourthPlacePercentage > 0,
      },
    });

    return reply.status(201).send(result);
  } catch (err) {
    if (err instanceof OnboardingError || err instanceof DrawError) {
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.ONBOARDING,
        userId: request.user.sub,
        message: err.message,
        metadata: {
          statusCode: err.statusCode,
          playerCount: request.body?.playerNames?.length ?? null,
        },
      });
    } else {
      logEvent({
        level: 'ERROR',
        journey: LOG_JOURNEYS.ONBOARDING,
        userId: request.user.sub,
        message: 'Unexpected onboarding error',
        metadata: {
          error:
            err instanceof Error
              ? err.message.substring(0, 200)
              : 'unknown_error',
        },
      });
    }

    if (err instanceof OnboardingError || err instanceof DrawError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
