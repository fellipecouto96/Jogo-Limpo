import type { FastifyInstance } from 'fastify';
import { logEvent } from '../../shared/logging/log.service.js';
import { LOG_JOURNEYS } from '../../shared/logging/journeys.js';

interface LogBody {
  journey: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function logsRoutes(app: FastifyInstance) {
  app.post<{ Body: LogBody }>('/logs', async (request, reply) => {
    const { journey, message, metadata } = request.body ?? {};

    if (!journey || typeof journey !== 'string' || !message || typeof message !== 'string') {
      return reply.status(400).send({ error: 'Campos de log obrigatorios nao informados' });
    }

    const safeJourney = (
      Object.values(LOG_JOURNEYS) as string[]
    ).includes(journey)
      ? (journey as (typeof LOG_JOURNEYS)[keyof typeof LOG_JOURNEYS])
      : LOG_JOURNEYS.SERVER_ERROR;

    logEvent({
      level: 'ERROR',
      journey: safeJourney,
      message: message.substring(0, 500),
      metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
    });

    return reply.status(204).send();
  });
}
