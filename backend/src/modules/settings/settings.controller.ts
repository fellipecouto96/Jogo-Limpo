import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  getSettings,
  updateSettings,
  SettingsError,
  type SettingsInput,
} from './settings.service.js';

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
      return reply.status(err.statusCode).send({ error: err.message });
    }
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
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
