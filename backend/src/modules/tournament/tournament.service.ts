import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../shared/database/prisma.js';
import { calculateFinancials } from './financials.js';

/** Count real players from round 1 matches: normal matches have 2, bye matches have 1. */
function countPlayers(matches: { isBye: boolean }[]): number {
  const byeCount = matches.filter((m) => m.isBye).length;
  return matches.length * 2 - byeCount;
}

export interface TournamentListItem {
  id: string;
  name: string;
  status: string;
  organizer: { id: string; name: string };
  playerCount: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export async function listTournaments(
  organizerId: string
): Promise<TournamentListItem[]> {
  const tournaments = await prisma.tournament.findMany({
    where: { organizerId },
    orderBy: { createdAt: 'desc' },
    include: {
      organizer: { select: { id: true, name: true } },
      rounds: {
        where: { roundNumber: 1 },
        include: { matches: { select: { isBye: true } } },
      },
    },
  });

  return tournaments.map((t) => {
    const matches = t.rounds[0]?.matches ?? [];
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      organizer: { id: t.organizer.id, name: t.organizer.name },
      playerCount: countPlayers(matches),
      createdAt: t.createdAt.toISOString(),
      startedAt: t.startedAt?.toISOString() ?? null,
      finishedAt: t.finishedAt?.toISOString() ?? null,
    };
  });
}

export interface TournamentDetail {
  id: string;
  name: string;
  status: string;
  playerCount: number;
  organizerName: string;
  drawSeed: string | null;
  entryFee: number | null;
  organizerPercentage: number | null;
  firstPlacePercentage: number | null;
  secondPlacePercentage: number | null;
  prizePool: number | null;
  totalCollected: number | null;
  organizerAmount: number | null;
  firstPlacePrize: number | null;
  secondPlacePrize: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export async function getTournamentById(
  tournamentId: string,
  organizerId: string
): Promise<TournamentDetail> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      organizer: { select: { name: true } },
      rounds: {
        where: { roundNumber: 1 },
        include: { matches: { select: { isBye: true } } },
      },
    },
  });

  if (!t) {
    throw new TournamentError('Torneio nao encontrado', 404);
  }
  if (t.organizerId !== organizerId) {
    throw new TournamentError('Acesso negado', 403);
  }

  const playerCount = countPlayers(t.rounds[0]?.matches ?? []);
  const snapshot =
    t.entryFee != null &&
    t.organizerPercentage != null &&
    t.firstPlacePercentage != null &&
    t.secondPlacePercentage != null
      ? calculateFinancials({
          entryFee: t.entryFee.toNumber(),
          playerCount,
          organizerPercentage: t.organizerPercentage.toNumber(),
          firstPlacePercentage: t.firstPlacePercentage.toNumber(),
          secondPlacePercentage: t.secondPlacePercentage.toNumber(),
        })
      : null;

  return {
    id: t.id,
    name: t.name,
    status: t.status,
    playerCount,
    organizerName: t.organizer.name,
    drawSeed: t.drawSeed,
    entryFee: t.entryFee?.toNumber() ?? null,
    organizerPercentage: t.organizerPercentage?.toNumber() ?? null,
    firstPlacePercentage: t.firstPlacePercentage?.toNumber() ?? null,
    secondPlacePercentage: t.secondPlacePercentage?.toNumber() ?? null,
    prizePool: t.prizePool?.toNumber() ?? null,
    totalCollected: snapshot?.totalCollected ?? t.totalCollected?.toNumber() ?? null,
    organizerAmount:
      snapshot?.organizerAmount ??
      (t.totalCollected && t.prizePool
        ? t.totalCollected.toNumber() - t.prizePool.toNumber()
        : null),
    firstPlacePrize:
      snapshot?.firstPlacePrize ??
      (t.prizePool && t.firstPlacePercentage
        ? (t.prizePool.toNumber() * t.firstPlacePercentage.toNumber()) / 100
        : null),
    secondPlacePrize:
      snapshot?.secondPlacePrize ??
      (t.prizePool && t.secondPlacePercentage
        ? (t.prizePool.toNumber() * t.secondPlacePercentage.toNumber()) / 100
        : null),
    createdAt: t.createdAt.toISOString(),
    startedAt: t.startedAt?.toISOString() ?? null,
    finishedAt: t.finishedAt?.toISOString() ?? null,
  };
}

export interface FinancialsInput {
  entryFee: number;
  organizerPercentage: number;
  firstPlacePercentage: number;
  secondPlacePercentage: number;
}

function validatePercentages(data: FinancialsInput) {
  const { organizerPercentage, firstPlacePercentage, secondPlacePercentage } = data;
  if (organizerPercentage < 0 || organizerPercentage > 100) {
    throw new TournamentError('Percentual do organizador deve ser entre 0 e 100', 400);
  }
  if (firstPlacePercentage < 0 || firstPlacePercentage > 100) {
    throw new TournamentError('Percentual do 1o lugar deve ser entre 0 e 100', 400);
  }
  if (secondPlacePercentage < 0 || secondPlacePercentage > 100) {
    throw new TournamentError('Percentual do 2o lugar deve ser entre 0 e 100', 400);
  }
  if (Math.abs(firstPlacePercentage + secondPlacePercentage - 100) > 0.01) {
    throw new TournamentError('Percentuais de 1o e 2o lugar devem somar 100', 400);
  }
}

export async function updateTournamentFinancials(
  tournamentId: string,
  organizerId: string,
  data: FinancialsInput
): Promise<TournamentDetail> {
  const { entryFee, organizerPercentage, firstPlacePercentage, secondPlacePercentage } = data;

  if (entryFee < 0) {
    throw new TournamentError('Taxa de inscricao deve ser >= 0', 400);
  }
  validatePercentages(data);

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      rounds: {
        where: { roundNumber: 1 },
        include: { matches: { select: { isBye: true } } },
      },
    },
  });

  if (!tournament) {
    throw new TournamentError('Torneio nao encontrado', 404);
  }
  if (tournament.organizerId !== organizerId) {
    throw new TournamentError('Acesso negado', 403);
  }

  const playerCount = countPlayers(tournament.rounds[0]?.matches ?? []);
  const snapshot = calculateFinancials({
    entryFee,
    playerCount,
    organizerPercentage,
    firstPlacePercentage,
    secondPlacePercentage,
  });

  const updated = await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      entryFee: new Decimal(entryFee),
      organizerPercentage: new Decimal(organizerPercentage),
      firstPlacePercentage: new Decimal(firstPlacePercentage),
      secondPlacePercentage: new Decimal(secondPlacePercentage),
      totalCollected: new Decimal(snapshot.totalCollected),
      prizePool: new Decimal(snapshot.prizePool),
    },
    include: {
      organizer: { select: { name: true } },
      rounds: {
        where: { roundNumber: 1 },
        include: { matches: { select: { isBye: true } } },
      },
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    status: updated.status,
    playerCount,
    organizerName: updated.organizer.name,
    drawSeed: updated.drawSeed,
    entryFee: updated.entryFee?.toNumber() ?? null,
    organizerPercentage: updated.organizerPercentage?.toNumber() ?? null,
    firstPlacePercentage: updated.firstPlacePercentage?.toNumber() ?? null,
    secondPlacePercentage: updated.secondPlacePercentage?.toNumber() ?? null,
    prizePool: updated.prizePool?.toNumber() ?? null,
    totalCollected: snapshot.totalCollected,
    organizerAmount: snapshot.organizerAmount,
    firstPlacePrize: snapshot.firstPlacePrize,
    secondPlacePrize: snapshot.secondPlacePrize,
    createdAt: updated.createdAt.toISOString(),
    startedAt: updated.startedAt?.toISOString() ?? null,
    finishedAt: updated.finishedAt?.toISOString() ?? null,
  };
}

export class TournamentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'TournamentError';
  }
}
