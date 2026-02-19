import { prisma } from '../../shared/database/prisma.js';
import { fetchBracket } from '../bracket/bracket.service.js';
import { getTournamentStatistics } from '../match/match.service.js';

export interface PublicProfileTournament {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  playerCount: number;
  championName: string | null;
  entryFee: number | null;
  prizePool: number | null;
}

export interface PublicProfile {
  name: string;
  tournaments: PublicProfileTournament[];
}

export interface PublicTournamentDetail {
  tournament: {
    id: string;
    name: string;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
    playerCount: number;
    championName: string | null;
    entryFee: number | null;
    prizePool: number | null;
  };
  bracket: Awaited<ReturnType<typeof fetchBracket>>;
  statistics: Awaited<ReturnType<typeof getTournamentStatistics>>;
}

export async function getPublicProfile(
  slug: string
): Promise<PublicProfile | null> {
  const organizer = await prisma.organizer.findUnique({
    where: { publicSlug: slug },
    select: {
      name: true,
      isPublicProfileEnabled: true,
      showFinancials: true,
      tournaments: {
        where: { status: { in: ['RUNNING', 'FINISHED'] } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          startedAt: true,
          finishedAt: true,
          entryFee: true,
          prizePool: true,
          champion: { select: { name: true } },
          matches: {
            select: { player1Id: true, player2Id: true },
          },
        },
      },
    },
  });

  if (!organizer || !organizer.isPublicProfileEnabled) {
    return null;
  }

  return {
    name: organizer.name,
    tournaments: organizer.tournaments.map((t) => {
      const playerIds = new Set<string>();
      for (const m of t.matches) {
        playerIds.add(m.player1Id);
        if (m.player2Id) playerIds.add(m.player2Id);
      }

      return {
        id: t.id,
        name: t.name,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        startedAt: t.startedAt?.toISOString() ?? null,
        finishedAt: t.finishedAt?.toISOString() ?? null,
        playerCount: playerIds.size,
        championName: t.champion?.name ?? null,
        entryFee: organizer.showFinancials && t.entryFee
          ? Number(t.entryFee)
          : null,
        prizePool: organizer.showFinancials && t.prizePool
          ? Number(t.prizePool)
          : null,
      };
    }),
  };
}

export async function getPublicTournamentDetail(
  slug: string,
  tournamentId: string
): Promise<PublicTournamentDetail | null> {
  const organizer = await prisma.organizer.findUnique({
    where: { publicSlug: slug },
    select: {
      id: true,
      isPublicProfileEnabled: true,
      showFinancials: true,
    },
  });

  if (!organizer || !organizer.isPublicProfileEnabled) {
    return null;
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      status: true,
      organizerId: true,
      startedAt: true,
      finishedAt: true,
      entryFee: true,
      prizePool: true,
      champion: { select: { name: true } },
      matches: {
        select: { player1Id: true, player2Id: true },
      },
    },
  });

  if (!tournament || tournament.organizerId !== organizer.id) {
    return null;
  }

  if (tournament.status !== 'RUNNING' && tournament.status !== 'FINISHED') {
    return null;
  }

  const playerIds = new Set<string>();
  for (const m of tournament.matches) {
    playerIds.add(m.player1Id);
    if (m.player2Id) playerIds.add(m.player2Id);
  }

  const bracket = await fetchBracket(tournamentId);
  const statistics = await getTournamentStatistics(tournamentId);

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      startedAt: tournament.startedAt?.toISOString() ?? null,
      finishedAt: tournament.finishedAt?.toISOString() ?? null,
      playerCount: playerIds.size,
      championName: tournament.champion?.name ?? null,
      entryFee: organizer.showFinancials && tournament.entryFee
        ? Number(tournament.entryFee)
        : null,
      prizePool: organizer.showFinancials && tournament.prizePool
        ? Number(tournament.prizePool)
        : null,
    },
    bracket,
    statistics,
  };
}
