import type { FastifyInstance } from 'fastify';
import {
  getProfile,
  getTournamentBySlug,
  getTournamentDetail,
} from './public-profile.controller.js';

export async function publicProfileRoutes(app: FastifyInstance) {
  app.get('/public/organizers/:slug', getProfile);
  app.get('/public/tournaments/:tournamentSlug', getTournamentBySlug);
  app.get(
    '/public/organizers/:slug/tournaments/:tournamentId',
    getTournamentDetail
  );
}
