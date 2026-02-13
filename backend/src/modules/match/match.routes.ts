import type { FastifyInstance } from 'fastify';
import {
  postUndoLastMatchResult,
  updateMatchResult,
} from './match.controller.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

export async function matchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.patch(
    '/tournaments/:tournamentId/matches/:matchId',
    updateMatchResult
  );
  app.post('/tournaments/:tournamentId/matches/undo-last', postUndoLastMatchResult);
}
