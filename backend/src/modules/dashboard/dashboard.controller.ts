import type { FastifyReply, FastifyRequest } from 'fastify';
import { getDashboardSummary } from './dashboard.service.js';

export async function fetchDashboard(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  const organizerId = request.user.sub;
  const page = request.query.page ? Number(request.query.page) : 1;
  const limit = request.query.limit ? Number(request.query.limit) : 8;
  const summary = await getDashboardSummary(organizerId, page, limit);
  return reply.send(summary);
}
