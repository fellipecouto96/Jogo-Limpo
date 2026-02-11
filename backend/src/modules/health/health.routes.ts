import type { FastifyInstance } from 'fastify';
import { healthCheck } from './health.controller.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', healthCheck);
}
