import type { FastifyReply, FastifyRequest } from 'fastify';
import { getDashboardSummary } from './dashboard.service.js';
import { logEvent } from '../../shared/logging/log.service.js';
import { LOG_JOURNEYS } from '../../shared/logging/journeys.js';

export async function fetchDashboard(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const organizerId = request.user.sub;
    const page = request.query.page ? Number(request.query.page) : 1;
    const limit = request.query.limit ? Number(request.query.limit) : 8;
    const summary = await getDashboardSummary(organizerId, page, limit);
    return reply.send(summary);
  } catch (err) {
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.DASHBOARD,
      userId: request.user.sub,
      message: 'Failed to fetch dashboard summary',
      metadata: {
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}
