import { prisma } from '../../shared/database/prisma.js';
import { fetchBracket } from '../bracket/bracket.service.js';
import { getTournamentStatistics } from '../match/match.service.js';
import { generateUniqueTournamentSlug } from '../tournament/public-slug.js';
import { withPerformanceLog } from '../../shared/logging/performance.service.js';
import { LOG_JOURNEYS } from '../../shared/logging/journeys.js';

export interface PublicProfileTournament {
  publicSlug: string;
  name: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  playerCount: number;
  championName: string | null;
}

export interface PublicProfile {
  name: string;
  tournaments: PublicProfileTournament[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export type PublicTournamentStatus = 'RUNNING' | 'FINISHED';

export interface PublicTournamentDetail {
  tournament: {
    publicSlug: string;
    name: string;
    status: string;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    playerCount: number;
    championName: string | null;
  };
  bracket: Awaited<ReturnType<typeof fetchBracket>>;
  statistics: Awaited<ReturnType<typeof getTournamentStatistics>>;
}

function countPlayersFromRoundOne(matches: { isBye: boolean }[]): number {
  const byeCount = matches.filter((match) => match.isBye).length;
  return matches.length * 2 - byeCount;
}

async function ensurePublicTournamentSlug(tournament: {
  id: string;
  name: string;
  publicSlug: string | null;
}): Promise<string> {
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

async function buildPublicTournamentDetail(tournament: {
  id: string;
  name: string;
  publicSlug: string | null;
  status: string;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  champion: { name: string } | null;
  rounds: Array<{ matches: Array<{ isBye: boolean }> }>;
}): Promise<PublicTournamentDetail> {
  const publicSlug = await ensurePublicTournamentSlug({
    id: tournament.id,
    name: tournament.name,
    publicSlug: tournament.publicSlug,
  });
  const playerCount = countPlayersFromRoundOne(tournament.rounds[0]?.matches ?? []);
  const [bracket, statistics] = await Promise.all([
    fetchBracket(tournament.id),
    getTournamentStatistics(tournament.id),
  ]);

  return {
    tournament: {
      publicSlug,
      name: tournament.name,
      status: tournament.status,
      createdAt: tournament.createdAt.toISOString(),
      startedAt: tournament.startedAt?.toISOString() ?? null,
      finishedAt: tournament.finishedAt?.toISOString() ?? null,
      playerCount,
      championName: tournament.champion?.name ?? null,
    },
    bracket,
    statistics,
  };
}

export async function getPublicProfile(
  slug: string,
  page = 1,
  limit = 8,
  status?: PublicTournamentStatus
): Promise<PublicProfile | null> {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safeLimit = Number.isFinite(limit)
    ? Math.min(30, Math.max(1, Math.floor(limit)))
    : 8;
  const skip = (safePage - 1) * safeLimit;

  const organizer = await withPerformanceLog(
    LOG_JOURNEYS.PUBLIC_PAGE,
    'public_profile_organizer_lookup',
    () =>
      prisma.organizer.findUnique({
        where: { publicSlug: slug },
        select: {
          id: true,
          name: true,
          isPublicProfileEnabled: true,
        },
      }),
    { slug }
  );

  if (!organizer || !organizer.isPublicProfileEnabled) {
    return null;
  }

  const where = {
    organizerId: organizer.id,
    status: status
      ? status
      : {
          in: ['RUNNING', 'FINISHED'] as PublicTournamentStatus[],
        },
  };

  const [tournaments, total] = await withPerformanceLog(
    LOG_JOURNEYS.PUBLIC_PAGE,
    'public_profile_tournaments',
    () =>
      Promise.all([
        prisma.tournament.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: safeLimit,
          select: {
            id: true,
            publicSlug: true,
            name: true,
            status: true,
            createdAt: true,
            startedAt: true,
            finishedAt: true,
            champion: { select: { name: true } },
            rounds: {
              where: { roundNumber: 1 },
              select: {
                matches: {
                  select: { isBye: true },
                },
              },
            },
          },
        }),
        prisma.tournament.count({ where }),
      ]),
    { slug, status: status ?? 'ALL', page: safePage, limit: safeLimit }
  );

  return {
    name: organizer.name,
    tournaments: await Promise.all(
      tournaments.map(async (t) => ({
        publicSlug: await ensurePublicTournamentSlug({
          id: t.id,
          name: t.name,
          publicSlug: t.publicSlug,
        }),
        name: t.name,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        startedAt: t.startedAt?.toISOString() ?? null,
        finishedAt: t.finishedAt?.toISOString() ?? null,
        playerCount: countPlayersFromRoundOne(t.rounds[0]?.matches ?? []),
        championName: t.champion?.name ?? null,
      }))
    ),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      hasMore: skip + tournaments.length < total,
    },
  };
}

export async function getPublicTournamentDetail(
  slug: string,
  tournamentId: string
): Promise<PublicTournamentDetail | null> {
  const organizer = await withPerformanceLog(
    LOG_JOURNEYS.PUBLIC_PAGE,
    'public_tournament_organizer_lookup',
    () =>
      prisma.organizer.findUnique({
        where: { publicSlug: slug },
        select: {
          id: true,
          isPublicProfileEnabled: true,
        },
      }),
    { slug }
  );

  if (!organizer || !organizer.isPublicProfileEnabled) {
    return null;
  }

  const tournament = await withPerformanceLog(
    LOG_JOURNEYS.PUBLIC_PAGE,
    'public_tournament_detail',
    () =>
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: {
          id: true,
          publicSlug: true,
          name: true,
          status: true,
          organizerId: true,
          createdAt: true,
          startedAt: true,
          finishedAt: true,
          champion: { select: { name: true } },
          rounds: {
            where: { roundNumber: 1 },
            select: {
              matches: {
                select: { isBye: true },
              },
            },
          },
        },
      }),
    { slug, tournamentId }
  );

  if (!tournament || tournament.organizerId !== organizer.id) {
    return null;
  }

  if (tournament.status !== 'RUNNING' && tournament.status !== 'FINISHED') {
    return null;
  }

  return buildPublicTournamentDetail(tournament);
}

export async function getPublicTournamentBySlug(
  tournamentSlug: string
): Promise<PublicTournamentDetail | null> {
  const tournament = await withPerformanceLog(
    LOG_JOURNEYS.PUBLIC_PAGE,
    'public_tournament_slug_lookup',
    () =>
      prisma.tournament.findUnique({
        where: { publicSlug: tournamentSlug },
        select: {
          id: true,
          publicSlug: true,
          name: true,
          status: true,
          createdAt: true,
          startedAt: true,
          finishedAt: true,
          champion: { select: { name: true } },
          rounds: {
            where: { roundNumber: 1 },
            select: {
              matches: {
                select: { isBye: true },
              },
            },
          },
        },
      }),
    { tournamentSlug }
  );

  if (!tournament) {
    return null;
  }
  if (tournament.status !== 'RUNNING' && tournament.status !== 'FINISHED') {
    return null;
  }

  return buildPublicTournamentDetail(tournament);
}
