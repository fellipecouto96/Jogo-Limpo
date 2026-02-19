import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  getSettingsHandler,
  updateSettingsHandler,
} from './settings.controller.js';

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.get('/organizer/settings', getSettingsHandler);
  app.patch('/organizer/settings', updateSettingsHandler);
}
