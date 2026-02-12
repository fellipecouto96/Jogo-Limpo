import type { FastifyInstance } from 'fastify';
import { setupOnboarding } from './onboarding.controller.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

export async function onboardingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.post('/onboarding/setup', setupOnboarding);
}
