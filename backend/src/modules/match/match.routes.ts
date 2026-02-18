import type { FastifyInstance } from 'fastify';
import {
  postUndoLastMatchResult,
  updateMatchResult,
  patchMatchScore,
  getStatistics,
} from './match.controller.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

export async function matchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  
  app.patch(
    '/tournaments/:tournamentId/matches/:matchId',
    updateMatchResult
  );
  
  app.patch(
    '/tournaments/:tournamentId/matches/:matchId/score',
    patchMatchScore
  );
  
  app.post('/tournaments/:tournamentId/matches/undo-last', postUndoLastMatchResult);
  
  app.get('/tournaments/:tournamentId/statistics', getStatistics);
}
