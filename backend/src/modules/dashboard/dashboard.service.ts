import { prisma } from '../../shared/database/prisma.js';

export interface DashboardSummary {
  metrics: {
    totalCollectedThisMonth: number;
    totalPrizePaid: number;
  };
  tournaments: Array<{
    id: string;
    name: string;
    status: string;
    playerCount: number;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
  }>;
}

function countPlayers(matches: { isBye: boolean }[]): number {
  const byeCount = matches.filter((m) => m.isBye).length;
  return matches.length * 2 - byeCount;
}

export async function getDashboardSummary(
  organizerId: string
): Promise<DashboardSummary> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

  const [
    tournamentsRaw,
    collectedAgg,
    prizeAgg,
  ] = await Promise.all([
    prisma.tournament.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        rounds: {
          where: { roundNumber: 1 },
          select: {
            matches: { select: { isBye: true } },
          },
        },
      },
    }),

    prisma.tournament.aggregate({
      where: {
        organizerId,
        createdAt: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      _sum: { totalCollected: true },
    }),

    prisma.tournament.aggregate({
      where: { organizerId, status: 'FINISHED' },
      _sum: { prizePool: true },
    }),
  ]);

  const tournaments = tournamentsRaw.map((t) => {
    const matches = t.rounds[0]?.matches ?? [];
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      playerCount: countPlayers(matches),
      createdAt: t.createdAt.toISOString(),
      startedAt: t.startedAt?.toISOString() ?? null,
      finishedAt: t.finishedAt?.toISOString() ?? null,
    };
  });

  const totalPrizePaid = prizeAgg._sum.prizePool
    ? Number(prizeAgg._sum.prizePool)
    : 0;
  const totalCollectedThisMonth = collectedAgg._sum.totalCollected
    ? Number(collectedAgg._sum.totalCollected)
    : 0;

  return {
    metrics: {
      totalCollectedThisMonth,
      totalPrizePaid,
    },
    tournaments,
  };
}
