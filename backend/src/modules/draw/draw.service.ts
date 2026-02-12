import crypto from 'node:crypto';
import { prisma } from '../../shared/database/prisma.js';
import { deterministicShuffle } from '../../shared/utils/prng.js';

export interface DrawResult {
  tournamentId: string;
  seed: string;
  totalRounds: number;
  firstRoundMatches: number;
  byeCount: number;
  generatedAt: string;
}

export function nextPowerOfTwo(n: number): number {
  let v = n - 1;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  return v + 1;
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

  // Generate reproducible seed and shuffle
  const seed = crypto.randomUUID();
  const shuffled = deterministicShuffle(playerIds, seed);

  // Calculate bracket dimensions
  const bracketSize = nextPowerOfTwo(numPlayers);
  const totalRounds = Math.log2(bracketSize);
  const totalFirstRoundSlots = bracketSize / 2;
  const byeCount = bracketSize - numPlayers;
  const normalMatchCount = totalFirstRoundSlots - byeCount;
  const generatedAt = new Date();

  // Distribute players into match slots:
  // - First normalMatchCount slots get 2 players each (normal matches)
  // - Last byeCount slots get 1 player each (bye matches, auto-advance)
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

    // Create normal matches (two players each)
    let playerIndex = 0;
    const matchPromises = [];

    for (let slot = 0; slot < normalMatchCount; slot++) {
      matchPromises.push(
        tx.match.create({
          data: {
            tournamentId,
            roundId: firstRound.id,
            player1Id: shuffled[playerIndex],
            player2Id: shuffled[playerIndex + 1],
            positionInBracket: slot + 1,
          },
        })
      );
      playerIndex += 2;
    }

    // Create bye matches (one player, auto-advance)
    for (let slot = 0; slot < byeCount; slot++) {
      const playerId = shuffled[playerIndex];
      matchPromises.push(
        tx.match.create({
          data: {
            tournamentId,
            roundId: firstRound.id,
            player1Id: playerId,
            player2Id: null,
            winnerId: playerId,
            isBye: true,
            positionInBracket: normalMatchCount + slot + 1,
            finishedAt: generatedAt,
          },
        })
      );
      playerIndex += 1;
    }

    await Promise.all(matchPromises);

    // Update tournament
    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        drawSeed: seed,
        status: 'RUNNING',
        startedAt: generatedAt,
      },
    });

    return { totalSlots: totalFirstRoundSlots };
  });

  return {
    tournamentId,
    seed,
    totalRounds,
    firstRoundMatches: result.totalSlots,
    byeCount,
    generatedAt: generatedAt.toISOString(),
  };
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
