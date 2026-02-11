import crypto from 'node:crypto';
import { prisma } from '../../shared/database/prisma.js';
import { deterministicShuffle } from '../../shared/utils/prng.js';

export interface DrawResult {
  tournamentId: string;
  seed: string;
  totalRounds: number;
  firstRoundMatches: number;
  generatedAt: string;
}

export async function generateDraw(
  tournamentId: string,
  playerIds: string[]
): Promise<DrawResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    throw new DrawError('Tournament not found', 404);
  }

  if (tournament.status !== 'OPEN') {
    throw new DrawError(
      `Draw only allowed when tournament status is OPEN (current: ${tournament.status})`,
      409
    );
  }

  if (tournament.drawSeed) {
    throw new DrawError('Draw already generated for this tournament', 409);
  }

  const numPlayers = playerIds.length;
  if (numPlayers < 2) {
    throw new DrawError('At least 2 players are required', 400);
  }

  if (!isPowerOfTwo(numPlayers)) {
    throw new DrawError(
      `Player count must be a power of two (got ${numPlayers}). ` +
        'Bye support is not yet implemented.',
      400
    );
  }

  // Validate all player IDs exist
  const existingPlayers = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true },
  });

  if (existingPlayers.length !== numPlayers) {
    const found = new Set(existingPlayers.map((p) => p.id));
    const missing = playerIds.filter((id) => !found.has(id));
    throw new DrawError(`Players not found: ${missing.join(', ')}`, 400);
  }

  // Generate reproducible seed
  const seed = crypto.randomUUID();
  const shuffled = deterministicShuffle(playerIds, seed);

  const totalRounds = Math.log2(numPlayers);
  const generatedAt = new Date();

  // Run everything inside a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create all rounds upfront
    const rounds = await Promise.all(
      Array.from({ length: totalRounds }, (_, i) =>
        tx.round.create({
          data: {
            tournamentId,
            roundNumber: i + 1,
          },
        })
      )
    );

    const firstRound = rounds[0];

    // Create round 1 matches from shuffled players
    const matchCount = numPlayers / 2;
    await Promise.all(
      Array.from({ length: matchCount }, (_, i) =>
        tx.match.create({
          data: {
            tournamentId,
            roundId: firstRound.id,
            player1Id: shuffled[i * 2],
            player2Id: shuffled[i * 2 + 1],
            positionInBracket: i + 1,
          },
        })
      )
    );

    // Update tournament
    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        drawSeed: seed,
        status: 'RUNNING',
        startedAt: generatedAt,
      },
    });

    return { matchCount };
  });

  return {
    tournamentId,
    seed,
    totalRounds,
    firstRoundMatches: result.matchCount,
    generatedAt: generatedAt.toISOString(),
  };
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export class DrawError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'DrawError';
  }
}
