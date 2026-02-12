import type { FastifyInstance } from 'fastify';
import { getTournaments } from './tournament.controller.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

export async function tournamentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.get('/tournaments', getTournaments);
}
