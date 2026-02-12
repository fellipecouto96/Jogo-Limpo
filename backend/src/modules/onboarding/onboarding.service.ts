import { prisma } from '../../shared/database/prisma.js';
import { generateDraw } from '../draw/draw.service.js';

export interface OnboardingInput {
  organizerId: string;
  tournamentName: string;
  playerNames: string[];
  prizePool?: number;
}

export interface OnboardingResult {
  organizerId: string;
  tournamentId: string;
  playerIds: string[];
}

export async function runOnboardingSetup(
  input: OnboardingInput
): Promise<OnboardingResult> {
  const { organizerId, tournamentName, playerNames, prizePool } = input;

  if (!tournamentName.trim()) {
    throw new OnboardingError('Tournament name is required', 400);
  }
  if (playerNames.length < 2) {
    throw new OnboardingError('At least 2 players are required', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.create({
      data: {
        name: tournamentName.trim(),
        organizerId,
        status: 'OPEN',
        prizePool: prizePool ?? null,
      },
    });

    const players = await Promise.all(
      playerNames.map((name) =>
        tx.player.create({ data: { name: name.trim() } })
      )
    );

    return {
      organizerId,
      tournamentId: tournament.id,
      playerIds: players.map((p) => p.id),
    };
  });

  // Run draw (this has its own transaction internally)
  await generateDraw(result.tournamentId, result.playerIds);

  return result;
}

export class OnboardingError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'OnboardingError';
  }
}
