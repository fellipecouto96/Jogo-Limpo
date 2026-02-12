import { prisma } from '../../shared/database/prisma.js';

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
        include: { _count: { select: { matches: true } } },
      },
    },
  });

  return tournaments.map((t) => {
    const firstRoundMatches = t.rounds[0]?._count.matches ?? 0;
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      organizer: { id: t.organizer.id, name: t.organizer.name },
      playerCount: firstRoundMatches * 2,
      createdAt: t.createdAt.toISOString(),
      startedAt: t.startedAt?.toISOString() ?? null,
      finishedAt: t.finishedAt?.toISOString() ?? null,
    };
  });
}
