import type { FastifyReply, FastifyRequest } from 'fastify';
import { getDashboardSummary } from './dashboard.service.js';

export async function fetchDashboard(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const organizerId = request.user.sub;
  const summary = await getDashboardSummary(organizerId);
  return reply.send(summary);
}
