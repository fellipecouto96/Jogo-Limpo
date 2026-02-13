import type { FastifyInstance } from 'fastify';
import {
  getTournaments,
  getTournament,
  patchTournamentFinancials,
  patchTournamentFinish,
  patchTournamentPlayer,
} from './tournament.controller.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

export async function tournamentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.get('/tournaments', getTournaments);
  app.get('/tournaments/:tournamentId', getTournament);
  app.patch('/tournaments/:tournamentId/financials', patchTournamentFinancials);
  app.patch('/tournaments/:tournamentId/finish', patchTournamentFinish);
  app.patch('/tournaments/:tournamentId/players/:playerId', patchTournamentPlayer);
}
