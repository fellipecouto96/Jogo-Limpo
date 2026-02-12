import type { FastifyInstance } from 'fastify';
import { getTournaments } from './tournament.controller.js';

export async function tournamentRoutes(app: FastifyInstance) {
  app.get('/tournaments', getTournaments);
}
