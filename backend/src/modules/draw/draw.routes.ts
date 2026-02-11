import type { FastifyInstance } from 'fastify';
import { createDraw } from './draw.controller.js';

export async function drawRoutes(app: FastifyInstance) {
  app.post('/tournaments/:tournamentId/draw', createDraw);
}
