import { prisma } from '../../shared/database/prisma.js';

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
  player1: { id: string; name: string };
  player2: { id: string; name: string } | null;
  winner: { id: string; name: string } | null;
  player1Score: number | null;
  player2Score: number | null;
  isBye: boolean;
  finishedAt: string | null;
}

export async function fetchBracket(
  tournamentId: string
): Promise<BracketResponse> {
  const tournament = await prisma.tournament.findUnique({
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
          matches: {
            orderBy: { positionInBracket: 'asc' },
            select: {
              id: true,
              positionInBracket: true,
              isBye: true,
              finishedAt: true,
              player1Score: true,
              player2Score: true,
              player1: { select: { id: true, name: true } },
              player2: { select: { id: true, name: true } },
              winner: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!tournament) {
    throw new BracketError('Torneio nao encontrado', 404);
  }

  const totalRounds = tournament.rounds.length;

  const rounds: BracketRound[] = tournament.rounds.map((round) => ({
    id: round.id,
    roundNumber: round.roundNumber,
    label: getRoundLabel(round.roundNumber, totalRounds),
    matches: round.matches.map((match) => ({
      id: match.id,
      positionInBracket: match.positionInBracket,
      player1: { id: match.player1.id, name: match.player1.name },
      player2: match.player2
        ? { id: match.player2.id, name: match.player2.name }
        : null,
      winner: match.winner
        ? { id: match.winner.id, name: match.winner.name }
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
    if (finalRound.matches.length === 1 && finalRound.matches[0].winner) {
      champion = finalRound.matches[0].winner;
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
