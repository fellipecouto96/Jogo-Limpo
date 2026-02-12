import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './shared/config/env.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { drawRoutes } from './modules/draw/draw.routes.js';
import { bracketRoutes } from './modules/bracket/bracket.routes.js';
import { tournamentRoutes } from './modules/tournament/tournament.routes.js';
import { onboardingRoutes } from './modules/onboarding/onboarding.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { matchRoutes } from './modules/match/match.routes.js';

export async function buildApp() {
  const app = fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '7d' },
  });

  // Public routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(bracketRoutes);

  // Protected routes
  await app.register(tournamentRoutes);
  await app.register(drawRoutes);
  await app.register(matchRoutes);
  await app.register(onboardingRoutes);
  await app.register(dashboardRoutes);

  return app;
}
