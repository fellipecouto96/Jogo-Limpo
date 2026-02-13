import type { FastifyInstance } from 'fastify';
import { healthCheck, rootInfo } from './health.controller.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', rootInfo);
  app.get('/health', healthCheck);
}
