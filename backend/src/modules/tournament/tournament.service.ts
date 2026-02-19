import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../shared/database/prisma.js';
import { calculateFinancials } from './financials.js';
import { generateUniqueTournamentSlug } from './public-slug.js';
import { withPerformanceLog } from '../../shared/logging/performance.service.js';

/** Count real players from round 1 matches: normal matches have 2, bye matches have 1. */
function countPlayers(matches: { isBye: boolean }[]): number {
  const byeCount = matches.filter((m) => m.isBye).length;
  return matches.length * 2 - byeCount;
}

const DEFAULT_CHAMPION_PERCENTAGE = 70;
const DEFAULT_RUNNER_UP_PERCENTAGE = 30;
const DEFAULT_THIRD_PLACE_PERCENTAGE = 0;
const DEFAULT_FOURTH_PLACE_PERCENTAGE = 0;

function decimalToNumber(value: Decimal | null | undefined): number | null {
  return value != null ? value.toNumber() : null;
}

async function ensureTournamentPublicSlug(
  tournament: { id: string; name: string; publicSlug: string | null }
): Promise<string> {
  if (tournament.publicSlug) {
    return tournament.publicSlug;
  }

  const publicSlug = await generateUniqueTournamentSlug(
    tournament.name,
    async (slug) => {
      const existing = await prisma.tournament.findUnique({
        where: { publicSlug: slug },
        select: { id: true },
      });
      return Boolean(existing);
    }
  );

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { publicSlug },
  });

  return publicSlug;
}

function resolveStoredPercentages(tournament: {
  championPercentage: Decimal | null;
  runnerUpPercentage: Decimal | null;
  thirdPlacePercentage: Decimal | null;
  fourthPlacePercentage?: Decimal | null;
  firstPlacePercentage: Decimal | null;
  secondPlacePercentage: Decimal | null;
}) {
  const championPercentage =
    decimalToNumber(tournament.championPercentage) ??
    decimalToNumber(tournament.firstPlacePercentage);
  const runnerUpPercentage =
    decimalToNumber(tournament.runnerUpPercentage) ??
    decimalToNumber(tournament.secondPlacePercentage);
  const thirdPlacePercentage =
    decimalToNumber(tournament.thirdPlacePercentage) ??
    (championPercentage != null || runnerUpPercentage != null
      ? DEFAULT_THIRD_PLACE_PERCENTAGE
      : null);
  const fourthPlacePercentage =
    decimalToNumber(tournament.fourthPlacePercentage ?? null) ??
    (championPercentage != null || runnerUpPercentage != null
      ? DEFAULT_FOURTH_PLACE_PERCENTAGE
      : null);

  return {
    championPercentage,
    runnerUpPercentage,
    thirdPlacePercentage,
    fourthPlacePercentage,
  };
}

export interface TournamentListItem {
  id: string;
  publicSlug: string | null;
  name: string;
  status: string;
  organizer: { id: string; name: string };
  playerCount: number;
  championName: string | null;
  totalCollected: number | null;
  organizerProfit: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface TournamentListResponse {
  items: TournamentListItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export async function listTournaments(
  organizerId: string,
  page = 1,
  limit = 20
): Promise<TournamentListResponse> {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safeLimit = Number.isFinite(limit)
    ? Math.min(50, Math.max(1, Math.floor(limit)))
    : 20;
  const skip = (safePage - 1) * safeLimit;

  const [tournaments, total] = await withPerformanceLog(
    'dashboard',
    'list_tournaments',
    () =>
      Promise.all([
        prisma.tournament.findMany({
          where: { organizerId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: safeLimit,
          select: {
            id: true,
            publicSlug: true,
            name: true,
            status: true,
            totalCollected: true,
            calculatedOrganizerAmount: true,
            prizePool: true,
            createdAt: true,
            startedAt: true,
            finishedAt: true,
            champion: { select: { name: true } },
            organizer: { select: { id: true, name: true } },
            rounds: {
              where: { roundNumber: 1 },
              select: { matches: { select: { isBye: true } } },
            },
          },
        }),
        prisma.tournament.count({ where: { organizerId } }),
      ]),
    { organizerId, page: safePage, limit: safeLimit }
  );

  const items = tournaments.map((t) => {
    const matches = t.rounds[0]?.matches ?? [];
    return {
      id: t.id,
      publicSlug: t.publicSlug,
      name: t.name,
      status: t.status,
      organizer: { id: t.organizer.id, name: t.organizer.name },
      playerCount: countPlayers(matches),
      championName: t.champion?.name ?? null,
      totalCollected: decimalToNumber(t.totalCollected),
      organizerProfit:
        decimalToNumber(t.calculatedOrganizerAmount) ??
        (t.totalCollected && t.prizePool
          ? t.totalCollected.toNumber() - t.prizePool.toNumber()
          : null),
      createdAt: t.createdAt.toISOString(),
      startedAt: t.startedAt?.toISOString() ?? null,
      finishedAt: t.finishedAt?.toISOString() ?? null,
    };
  });

  return {
    items,
    page: safePage,
    limit: safeLimit,
    total,
    hasMore: skip + items.length < total,
  };
}

export interface TournamentDetail {
  id: string;
  publicSlug: string;
  name: string;
  status: string;
  playerCount: number;
  organizerName: string;
  drawSeed: string | null;
  entryFee: number | null;
  organizerPercentage: number | null;
  championPercentage: number | null;
  runnerUpPercentage: number | null;
  thirdPlacePercentage: number | null;
  fourthPlacePercentage: number | null;
  firstPlacePercentage: number | null;
  secondPlacePercentage: number | null;
  calculatedPrizePool: number | null;
  calculatedOrganizerAmount: number | null;
  prizePool: number | null;
  totalCollected: number | null;
  organizerAmount: number | null;
  championPrize: number | null;
  runnerUpPrize: number | null;
  thirdPlacePrize: number | null;
  fourthPlacePrize: number | null;
  firstPlacePrize: number | null;
  secondPlacePrize: number | null;
  champion: { id: string; name: string } | null;
  runnerUp: { id: string; name: string } | null;
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
    select: {
      id: true,
      publicSlug: true,
      name: true,
      status: true,
      organizerId: true,
      drawSeed: true,
      entryFee: true,
      organizerPercentage: true,
      championPercentage: true,
      runnerUpPercentage: true,
      thirdPlacePercentage: true,
      fourthPlacePercentage: true,
      firstPlacePercentage: true,
      secondPlacePercentage: true,
      calculatedPrizePool: true,
      calculatedOrganizerAmount: true,
      prizePool: true,
      totalCollected: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      organizer: { select: { name: true } },
      champion: { select: { id: true, name: true } },
      runnerUp: { select: { id: true, name: true } },
      rounds: {
        where: { roundNumber: 1 },
        select: { matches: { select: { isBye: true } } },
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
  const publicSlug = await ensureTournamentPublicSlug({
    id: t.id,
    name: t.name,
    publicSlug: t.publicSlug,
  });
  const percentages = resolveStoredPercentages(t);
  const entryFee = decimalToNumber(t.entryFee);
  const organizerPercentage = decimalToNumber(t.organizerPercentage);
  const snapshot =
    entryFee != null &&
    organizerPercentage != null &&
    percentages.championPercentage != null &&
    percentages.runnerUpPercentage != null &&
    percentages.thirdPlacePercentage != null &&
    percentages.fourthPlacePercentage != null
      ? calculateFinancials({
          entryFee,
          playerCount,
          organizerPercentage,
          championPercentage: percentages.championPercentage,
          runnerUpPercentage: percentages.runnerUpPercentage,
          thirdPlacePercentage: percentages.thirdPlacePercentage,
          fourthPlacePercentage: percentages.fourthPlacePercentage,
        })
      : null;

  return {
    id: t.id,
    publicSlug,
    name: t.name,
    status: t.status,
    playerCount,
    organizerName: t.organizer.name,
    drawSeed: t.drawSeed,
    entryFee,
    organizerPercentage,
    championPercentage: percentages.championPercentage,
    runnerUpPercentage: percentages.runnerUpPercentage,
    thirdPlacePercentage: percentages.thirdPlacePercentage,
    fourthPlacePercentage: percentages.fourthPlacePercentage,
    firstPlacePercentage:
      percentages.championPercentage ??
      decimalToNumber(t.firstPlacePercentage),
    secondPlacePercentage:
      percentages.runnerUpPercentage ??
      decimalToNumber(t.secondPlacePercentage),
    calculatedPrizePool:
      snapshot?.prizePool ??
      decimalToNumber(t.calculatedPrizePool) ??
      decimalToNumber(t.prizePool),
    calculatedOrganizerAmount:
      snapshot?.organizerAmount ??
      decimalToNumber(t.calculatedOrganizerAmount) ??
      (t.totalCollected && t.prizePool
        ? t.totalCollected.toNumber() - t.prizePool.toNumber()
        : null),
    prizePool:
      snapshot?.prizePool ??
      decimalToNumber(t.calculatedPrizePool) ??
      decimalToNumber(t.prizePool),
    totalCollected:
      snapshot?.totalCollected ?? decimalToNumber(t.totalCollected),
    organizerAmount:
      snapshot?.organizerAmount ??
      decimalToNumber(t.calculatedOrganizerAmount) ??
      (t.totalCollected && t.prizePool
        ? t.totalCollected.toNumber() - t.prizePool.toNumber()
        : null),
    championPrize:
      snapshot?.championPrize ??
      (t.prizePool && percentages.championPercentage != null
        ? (t.prizePool.toNumber() * percentages.championPercentage) / 100
        : null),
    runnerUpPrize:
      snapshot?.runnerUpPrize ??
      (t.prizePool && percentages.runnerUpPercentage != null
        ? (t.prizePool.toNumber() * percentages.runnerUpPercentage) / 100
        : null),
    thirdPlacePrize:
      snapshot?.thirdPlacePrize ??
      (t.prizePool && percentages.thirdPlacePercentage != null
        ? (t.prizePool.toNumber() * percentages.thirdPlacePercentage) / 100
        : null),
    fourthPlacePrize:
      snapshot?.fourthPlacePrize ??
      (t.prizePool && percentages.fourthPlacePercentage != null
        ? (t.prizePool.toNumber() * percentages.fourthPlacePercentage) / 100
        : null),
    firstPlacePrize:
      snapshot?.championPrize ??
      (t.prizePool && percentages.championPercentage != null
        ? (t.prizePool.toNumber() * percentages.championPercentage) / 100
        : null),
    secondPlacePrize:
      snapshot?.runnerUpPrize ??
      (t.prizePool && percentages.runnerUpPercentage != null
        ? (t.prizePool.toNumber() * percentages.runnerUpPercentage) / 100
        : null),
    champion: t.champion
      ? { id: t.champion.id, name: t.champion.name }
      : null,
    runnerUp: t.runnerUp
      ? { id: t.runnerUp.id, name: t.runnerUp.name }
      : null,
    createdAt: t.createdAt.toISOString(),
    startedAt: t.startedAt?.toISOString() ?? null,
    finishedAt: t.finishedAt?.toISOString() ?? null,
  };
}

export interface FinancialsInput {
  entryFee: number;
  organizerPercentage: number;
  championPercentage?: number;
  runnerUpPercentage?: number;
  thirdPlacePercentage?: number | null;
  fourthPlacePercentage?: number | null;
  firstPlacePercentage?: number;
  secondPlacePercentage?: number;
}

function resolveFinancialInputPercentages(data: FinancialsInput) {
  const championPercentage =
    data.championPercentage ?? data.firstPlacePercentage;
  const runnerUpPercentage =
    data.runnerUpPercentage ?? data.secondPlacePercentage;
  const thirdPlacePercentage =
    data.thirdPlacePercentage ?? DEFAULT_THIRD_PLACE_PERCENTAGE;
  const fourthPlacePercentage =
    data.fourthPlacePercentage ?? DEFAULT_FOURTH_PLACE_PERCENTAGE;

  if (championPercentage == null || runnerUpPercentage == null) {
    throw new TournamentError(
      'Percentuais de campeao e vice sao obrigatorios',
      400
    );
  }

  return {
    championPercentage,
    runnerUpPercentage,
    thirdPlacePercentage,
    fourthPlacePercentage,
  };
}

function validatePercentages(data: FinancialsInput) {
  const { organizerPercentage } = data;
  const {
    championPercentage,
    runnerUpPercentage,
    thirdPlacePercentage,
    fourthPlacePercentage,
  } = resolveFinancialInputPercentages(data);

  if (organizerPercentage < 0 || organizerPercentage > 100) {
    throw new TournamentError('Percentual do organizador deve ser entre 0 e 100', 400);
  }
  if (championPercentage < 0 || championPercentage > 100) {
    throw new TournamentError('Percentual do campeao deve ser entre 0 e 100', 400);
  }
  if (runnerUpPercentage < 0 || runnerUpPercentage > 100) {
    throw new TournamentError('Percentual do vice deve ser entre 0 e 100', 400);
  }
  if (thirdPlacePercentage < 0 || thirdPlacePercentage > 100) {
    throw new TournamentError('Percentual do 3o lugar deve ser entre 0 e 100', 400);
  }
  if (fourthPlacePercentage < 0 || fourthPlacePercentage > 100) {
    throw new TournamentError('Percentual do 4o lugar deve ser entre 0 e 100', 400);
  }
  if (
    Math.abs(
      championPercentage + runnerUpPercentage + thirdPlacePercentage + fourthPlacePercentage - 100
    ) > 0.01
  ) {
    throw new TournamentError(
      'Percentuais de campeao, vice, terceiro e quarto devem somar 100',
      400
    );
  }
}

export async function updateTournamentFinancials(
  tournamentId: string,
  organizerId: string,
  data: FinancialsInput
): Promise<TournamentDetail> {
  const { entryFee, organizerPercentage } = data;
  const {
    championPercentage,
    runnerUpPercentage,
    thirdPlacePercentage,
    fourthPlacePercentage,
  } = resolveFinancialInputPercentages(data);

  if (entryFee < 0) {
    throw new TournamentError('Taxa de inscricao deve ser >= 0', 400);
  }
  validatePercentages(data);

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      organizerId: true,
      status: true,
      rounds: {
        where: { roundNumber: 1 },
        select: { matches: { select: { isBye: true } } },
      },
    },
  });

  if (!tournament) {
    throw new TournamentError('Torneio nao encontrado', 404);
  }
  if (tournament.organizerId !== organizerId) {
    throw new TournamentError('Acesso negado', 403);
  }
  if (tournament.status === 'FINISHED') {
    throw new TournamentError('Torneio finalizado nao pode ser editado', 409);
  }

  const playerCount = countPlayers(tournament.rounds[0]?.matches ?? []);
  const snapshot = calculateFinancials({
    entryFee,
    playerCount,
    organizerPercentage,
    championPercentage,
    runnerUpPercentage,
    thirdPlacePercentage,
    fourthPlacePercentage,
  });

  const updated = await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      entryFee: new Decimal(entryFee),
      organizerPercentage: new Decimal(organizerPercentage),
      championPercentage: new Decimal(championPercentage),
      runnerUpPercentage: new Decimal(runnerUpPercentage),
      thirdPlacePercentage: new Decimal(thirdPlacePercentage),
      fourthPlacePercentage: new Decimal(fourthPlacePercentage),
      firstPlacePercentage: new Decimal(championPercentage),
      secondPlacePercentage: new Decimal(runnerUpPercentage),
      totalCollected: new Decimal(snapshot.totalCollected),
      calculatedOrganizerAmount: new Decimal(snapshot.organizerAmount),
      calculatedPrizePool: new Decimal(snapshot.prizePool),
      prizePool: new Decimal(snapshot.prizePool),
    },
    select: {
      id: true,
      publicSlug: true,
      name: true,
      status: true,
      drawSeed: true,
      entryFee: true,
      organizerPercentage: true,
      championPercentage: true,
      runnerUpPercentage: true,
      thirdPlacePercentage: true,
      fourthPlacePercentage: true,
      firstPlacePercentage: true,
      secondPlacePercentage: true,
      calculatedPrizePool: true,
      calculatedOrganizerAmount: true,
      prizePool: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      organizer: { select: { name: true } },
      champion: { select: { id: true, name: true } },
      runnerUp: { select: { id: true, name: true } },
      rounds: {
        where: { roundNumber: 1 },
        select: { matches: { select: { isBye: true } } },
      },
    },
  });

  return {
    id: updated.id,
    publicSlug: (await ensureTournamentPublicSlug({
      id: updated.id,
      name: updated.name,
      publicSlug: updated.publicSlug,
    })),
    name: updated.name,
    status: updated.status,
    playerCount,
    organizerName: updated.organizer.name,
    drawSeed: updated.drawSeed,
    entryFee: updated.entryFee?.toNumber() ?? null,
    organizerPercentage: updated.organizerPercentage?.toNumber() ?? null,
    championPercentage:
      updated.championPercentage?.toNumber() ??
      updated.firstPlacePercentage?.toNumber() ??
      null,
    runnerUpPercentage:
      updated.runnerUpPercentage?.toNumber() ??
      updated.secondPlacePercentage?.toNumber() ??
      null,
    thirdPlacePercentage: updated.thirdPlacePercentage?.toNumber() ?? null,
    fourthPlacePercentage: updated.fourthPlacePercentage?.toNumber() ?? null,
    firstPlacePercentage:
      updated.championPercentage?.toNumber() ??
      updated.firstPlacePercentage?.toNumber() ??
      null,
    secondPlacePercentage:
      updated.runnerUpPercentage?.toNumber() ??
      updated.secondPlacePercentage?.toNumber() ??
      null,
    calculatedPrizePool:
      updated.calculatedPrizePool?.toNumber() ?? snapshot.prizePool,
    calculatedOrganizerAmount:
      updated.calculatedOrganizerAmount?.toNumber() ?? snapshot.organizerAmount,
    prizePool: updated.prizePool?.toNumber() ?? null,
    totalCollected: snapshot.totalCollected,
    organizerAmount: snapshot.organizerAmount,
    championPrize: snapshot.championPrize,
    runnerUpPrize: snapshot.runnerUpPrize,
    thirdPlacePrize: snapshot.thirdPlacePrize,
    fourthPlacePrize: snapshot.fourthPlacePrize,
    firstPlacePrize: snapshot.firstPlacePrize,
    secondPlacePrize: snapshot.secondPlacePrize,
    champion: updated.champion
      ? { id: updated.champion.id, name: updated.champion.name }
      : null,
    runnerUp: updated.runnerUp
      ? { id: updated.runnerUp.id, name: updated.runnerUp.name }
      : null,
    createdAt: updated.createdAt.toISOString(),
    startedAt: updated.startedAt?.toISOString() ?? null,
    finishedAt: updated.finishedAt?.toISOString() ?? null,
  };
}

export async function finishTournament(
  tournamentId: string,
  organizerId: string
): Promise<TournamentDetail> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      status: true,
      organizerId: true,
      championId: true,
      runnerUpId: true,
    },
  });

  if (!tournament) {
    throw new TournamentError('Torneio nao encontrado', 404);
  }
  if (tournament.organizerId !== organizerId) {
    throw new TournamentError('Acesso negado', 403);
  }
  if (tournament.status === 'FINISHED') {
    return getTournamentById(tournamentId, organizerId);
  }

  const finalRound = await prisma.round.findFirst({
    where: { tournamentId },
    orderBy: { roundNumber: 'desc' },
    include: {
      matches: {
        orderBy: { positionInBracket: 'asc' },
        select: {
          player1Id: true,
          player2Id: true,
          winnerId: true,
        },
      },
    },
  });

  let championId = tournament.championId;
  let runnerUpId = tournament.runnerUpId;

  const finalMatch =
    finalRound && finalRound.matches.length === 1
      ? finalRound.matches[0]
      : null;

  if (finalMatch?.winnerId) {
    championId = finalMatch.winnerId;
    runnerUpId =
      finalMatch.player1Id === finalMatch.winnerId
        ? finalMatch.player2Id
        : finalMatch.player1Id;
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: 'FINISHED',
      finishedAt: new Date(),
      championId: championId ?? null,
      runnerUpId: runnerUpId ?? null,
    },
  });

  return getTournamentById(tournamentId, organizerId);
}

export interface UpdatedPlayer {
  id: string;
  name: string;
}

export async function renameTournamentPlayer(
  tournamentId: string,
  organizerId: string,
  playerId: string,
  name: string
): Promise<UpdatedPlayer> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new TournamentError('Nome do jogador e obrigatorio', 400);
  }
  if (trimmedName.length > 80) {
    throw new TournamentError('Nome do jogador muito longo', 400);
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true, status: true },
  });

  if (!tournament) {
    throw new TournamentError('Torneio nao encontrado', 404);
  }
  if (tournament.organizerId !== organizerId) {
    throw new TournamentError('Acesso negado', 403);
  }
  if (tournament.status === 'FINISHED') {
    throw new TournamentError('Torneio finalizado nao pode ser editado', 409);
  }

  const belongsToTournament = await prisma.match.count({
    where: {
      tournamentId,
      OR: [{ player1Id: playerId }, { player2Id: playerId }],
    },
  });

  if (belongsToTournament === 0) {
    throw new TournamentError('Jogador nao pertence a este torneio', 404);
  }

  const updated = await prisma.player.update({
    where: { id: playerId },
    data: { name: trimmedName },
    select: { id: true, name: true },
  });

  return updated;
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
