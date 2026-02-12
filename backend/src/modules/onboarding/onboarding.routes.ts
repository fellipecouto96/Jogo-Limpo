import type { FastifyInstance } from 'fastify';
import { setupOnboarding } from './onboarding.controller.js';

export async function onboardingRoutes(app: FastifyInstance) {
  app.post('/onboarding/setup', setupOnboarding);
}
