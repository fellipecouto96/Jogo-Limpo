import type { FastifyInstance } from 'fastify';
import { fetchDashboard } from './dashboard.controller.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.get('/dashboard-summary', fetchDashboard);
}
