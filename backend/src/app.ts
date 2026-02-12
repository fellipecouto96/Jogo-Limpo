import fastify from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './modules/health/health.routes.js';
import { drawRoutes } from './modules/draw/draw.routes.js';
import { bracketRoutes } from './modules/bracket/bracket.routes.js';
import { tournamentRoutes } from './modules/tournament/tournament.routes.js';
import { onboardingRoutes } from './modules/onboarding/onboarding.routes.js';

export async function buildApp() {
  const app = fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(healthRoutes);
  await app.register(tournamentRoutes);
  await app.register(drawRoutes);
  await app.register(bracketRoutes);
  await app.register(onboardingRoutes);

  return app;
}
