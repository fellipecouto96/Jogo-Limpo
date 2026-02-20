import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  getSettings,
  updateSettings,
  SettingsError,
  type SettingsInput,
} from './settings.service.js';
import { logEvent } from '../../shared/logging/log.service.js';
import { LOG_JOURNEYS } from '../../shared/logging/journeys.js';

export async function getSettingsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const organizerId = (request.user as { sub: string }).sub;
    const settings = await getSettings(organizerId);
    return reply.send(settings);
  } catch (err) {
    if (err instanceof SettingsError) {
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.SETTINGS,
        userId: (request.user as { sub: string }).sub,
        message: err.message,
        metadata: { statusCode: err.statusCode, action: 'get' },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.SETTINGS,
      userId: (request.user as { sub: string }).sub,
      message: 'Unexpected settings error',
      metadata: {
        action: 'get',
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}

export async function updateSettingsHandler(
  request: FastifyRequest<{ Body: SettingsInput }>,
  reply: FastifyReply
) {
  try {
    const organizerId = (request.user as { sub: string }).sub;
    const settings = await updateSettings(organizerId, request.body);
    return reply.send(settings);
  } catch (err) {
    if (err instanceof SettingsError) {
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.SETTINGS,
        userId: (request.user as { sub: string }).sub,
        message: err.message,
        metadata: { statusCode: err.statusCode, action: 'update' },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.SETTINGS,
      userId: (request.user as { sub: string }).sub,
      message: 'Unexpected settings update error',
      metadata: {
        action: 'update',
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}
