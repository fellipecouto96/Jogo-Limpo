import { prisma } from '../../shared/database/prisma.js';

export interface DashboardSummary {
  metrics: {
    totalTournaments: number;
    totalPlayers: number;
    totalPrizeDistributed: number;
  };
  activeTournaments: Array<{
    id: string;
    name: string;
    status: string;
    playerCount: number;
    createdAt: string;
    startedAt: string | null;
  }>;
  finishedTournaments: Array<{
    id: string;
    name: string;
    champion: { id: string; name: string } | null;
    runnerUp: { id: string; name: string } | null;
    playerCount: number;
    prizePool: number | null;
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
  const [
    activeTournamentsRaw,
    finishedTournamentsRaw,
    totalTournaments,
    prizeAgg,
  ] = await Promise.all([
    prisma.tournament.findMany({
      where: { organizerId, status: { in: ['OPEN', 'RUNNING'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        rounds: {
          where: { roundNumber: 1 },
          include: { matches: { select: { isBye: true } } },
        },
      },
    }),

    prisma.tournament.findMany({
      where: { organizerId, status: 'FINISHED' },
      orderBy: { finishedAt: 'desc' },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            matches: {
              include: {
                player1: { select: { id: true, name: true } },
                player2: { select: { id: true, name: true } },
                winner: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),

    prisma.tournament.count({ where: { organizerId } }),

    prisma.tournament.aggregate({
      where: { organizerId, status: 'FINISHED' },
      _sum: { prizePool: true },
    }),
  ]);

  // Count distinct players across all organizer's first-round matches
  const allTournamentIds = [
    ...activeTournamentsRaw.map((t) => t.id),
    ...finishedTournamentsRaw.map((t) => t.id),
  ];

  let totalPlayers = 0;
  if (allTournamentIds.length > 0) {
    const playerCountResult = await prisma.$queryRaw<
      [{ count: bigint }]
    >`SELECT COUNT(DISTINCT pid) as count FROM (
        SELECT player1_id AS pid FROM matches
        WHERE tournament_id = ANY(${allTournamentIds})
        UNION
        SELECT player2_id AS pid FROM matches
        WHERE tournament_id = ANY(${allTournamentIds})
          AND player2_id IS NOT NULL
      ) sub`;
    totalPlayers = Number(playerCountResult[0].count);
  }

  const activeTournaments = activeTournamentsRaw.map((t) => {
    const matches = t.rounds[0]?.matches ?? [];
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      playerCount: countPlayers(matches),
      createdAt: t.createdAt.toISOString(),
      startedAt: t.startedAt?.toISOString() ?? null,
    };
  });

  const finishedTournaments = finishedTournamentsRaw.map((t) => {
    const totalRounds = t.rounds.length;
    const firstRound = t.rounds[0];
    const playerCount = firstRound
      ? countPlayers(firstRound.matches.map((m) => ({ isBye: m.isBye })))
      : 0;

    let champion: { id: string; name: string } | null = null;
    let runnerUp: { id: string; name: string } | null = null;

    if (totalRounds > 0) {
      const finalRound = t.rounds[totalRounds - 1];
      if (finalRound.matches.length === 1) {
        const finalMatch = finalRound.matches[0];
        if (finalMatch.winner) {
          champion = {
            id: finalMatch.winner.id,
            name: finalMatch.winner.name,
          };
          if (finalMatch.player2) {
            const loser =
              finalMatch.winner.id === finalMatch.player1.id
                ? finalMatch.player2
                : finalMatch.player1;
            runnerUp = { id: loser.id, name: loser.name };
          }
        }
      }
    }

    return {
      id: t.id,
      name: t.name,
      champion,
      runnerUp,
      playerCount,
      prizePool: t.prizePool ? Number(t.prizePool) : null,
      finishedAt: t.finishedAt?.toISOString() ?? null,
    };
  });

  const totalPrizeDistributed = prizeAgg._sum.prizePool
    ? Number(prizeAgg._sum.prizePool)
    : 0;

  return {
    metrics: {
      totalTournaments,
      totalPlayers,
      totalPrizeDistributed,
    },
    activeTournaments,
    finishedTournaments,
  };
}
