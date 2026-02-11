import fastify from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './modules/health/health.routes.js';

export async function buildApp() {
  const app = fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(healthRoutes);

  return app;
}
