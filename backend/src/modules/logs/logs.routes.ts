import type { FastifyInstance } from 'fastify';
import { logEvent } from '../../shared/logging/log.service.js';

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

    logEvent({
      level: 'ERROR',
      journey: journey.substring(0, 50),
      message: message.substring(0, 500),
      metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
    });

    return reply.status(204).send();
  });
}
