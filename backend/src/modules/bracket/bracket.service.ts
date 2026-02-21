import { prisma } from '../../shared/database/prisma.js';
import { withPerformanceLog } from '../../shared/logging/performance.service.js';
import { LOG_JOURNEYS } from '../../shared/logging/journeys.js';

export interface BracketResponse {
  tournament: {
    id: string;
    name: string;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
  };
  totalRounds: number;
  rounds: BracketRound[];
  champion: { id: string; name: string } | null;
}

interface BracketRound {
  id: string;
  roundNumber: number;
  label: string;
  matches: BracketMatch[];
}

interface BracketMatch {
  id: string;
  positionInBracket: number;
  player1: { id: string; name: string; isRebuy: boolean };
  player2: { id: string; name: string; isRebuy: boolean } | null;
  winner: { id: string; name: string; isRebuy: boolean } | null;
  player1Score: number | null;
  player2Score: number | null;
  isBye: boolean;
  finishedAt: string | null;
}

export async function fetchBracket(
  tournamentId: string
): Promise<BracketResponse> {
  const tournament = await withPerformanceLog(
    LOG_JOURNEYS.PUBLIC_PAGE,
    'fetch_bracket',
    () =>
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: {
          id: true,
          name: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          rounds: {
            orderBy: { roundNumber: 'asc' },
            select: {
              id: true,
              roundNumber: true,
              isRepechage: true,
              matches: {
                orderBy: { positionInBracket: 'asc' },
                select: {
                  id: true,
                  positionInBracket: true,
                  isBye: true,
                  finishedAt: true,
                  player1Score: true,
                  player2Score: true,
                  player1: { select: { id: true, name: true, isRebuy: true } },
                  player2: { select: { id: true, name: true, isRebuy: true } },
                  winner: { select: { id: true, name: true, isRebuy: true } },
                },
              },
            },
          },
        },
      }),
    { tournamentId }
  );

  if (!tournament) {
    throw new BracketError('Torneio nao encontrado', 404);
  }

  const totalRounds = tournament.rounds.length;

  const rounds: BracketRound[] = tournament.rounds.map((round) => ({
    id: round.id,
    roundNumber: round.roundNumber,
    label: round.isRepechage ? 'Rodada de Repescagem' : getRoundLabel(round.roundNumber, totalRounds),
    matches: round.matches.map((match) => ({
      id: match.id,
      positionInBracket: match.positionInBracket,
      player1: { id: match.player1.id, name: match.player1.name, isRebuy: match.player1.isRebuy },
      player2: match.player2
        ? { id: match.player2.id, name: match.player2.name, isRebuy: match.player2.isRebuy }
        : null,
      winner: match.winner
        ? { id: match.winner.id, name: match.winner.name, isRebuy: match.winner.isRebuy }
        : null,
      player1Score: match.player1Score,
      player2Score: match.player2Score,
      isBye: match.isBye,
      finishedAt: match.finishedAt?.toISOString() ?? null,
    })),
  }));

  let champion: { id: string; name: string } | null = null;
  if (tournament.status === 'FINISHED' && totalRounds > 0) {
    const finalRound = rounds[totalRounds - 1];
    const championshipMatch =
      finalRound.matches.find((m) => m.positionInBracket === 1) ?? null;
    if (championshipMatch?.winner) {
      champion = championshipMatch.winner;
    }
  }

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      startedAt: tournament.startedAt?.toISOString() ?? null,
      finishedAt: tournament.finishedAt?.toISOString() ?? null,
    },
    totalRounds,
    rounds,
    champion,
  };
}

function getRoundLabel(roundNumber: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - roundNumber;
  const labels: Record<number, string> = {
    0: 'Final',
    1: 'Semifinal',
    2: 'Quartas de Final',
    3: 'Oitavas de Final',
  };
  return labels[roundsFromEnd] ?? `Rodada ${roundNumber}`;
}

export class BracketError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'BracketError';
  }
}
