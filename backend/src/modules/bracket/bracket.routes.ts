import type { FastifyInstance } from 'fastify';
import { getBracket } from './bracket.controller.js';

export async function bracketRoutes(app: FastifyInstance) {
  app.get('/tournaments/:tournamentId/bracket', getBracket);
}
