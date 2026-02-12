import type { FastifyInstance } from 'fastify';
import { createDraw } from './draw.controller.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

export async function drawRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.post('/tournaments/:tournamentId/draw', createDraw);
}
