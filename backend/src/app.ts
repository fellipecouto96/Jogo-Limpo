import fastify, { type FastifyError } from 'fastify';
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
import { publicProfileRoutes } from './modules/public-profile/public-profile.routes.js';
import { settingsRoutes } from './modules/settings/settings.routes.js';
import { logsRoutes } from './modules/logs/logs.routes.js';
import { logEvent } from './shared/logging/log.service.js';
import { LOG_JOURNEYS } from './shared/logging/journeys.js';

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
  await app.register(publicProfileRoutes);
  await app.register(logsRoutes);

  // Protected routes
  await app.register(tournamentRoutes);
  await app.register(drawRoutes);
  await app.register(matchRoutes);
  await app.register(onboardingRoutes);
  await app.register(dashboardRoutes);
  await app.register(settingsRoutes);

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.SERVER_ERROR,
      message: error.message ?? 'Erro interno desconhecido',
      metadata: {
        statusCode: error.statusCode,
        stack: error.stack?.substring(0, 500),
      },
    });
    const statusCode = error.statusCode ?? 500;
    const safeMessage =
      statusCode >= 500
        ? 'Ocorreu um erro inesperado'
        : 'Nao foi possivel concluir a solicitacao';
    reply.status(statusCode).send({
      error: safeMessage,
    });
  });

  return app;
}
