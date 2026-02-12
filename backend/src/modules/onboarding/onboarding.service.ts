import { prisma } from '../../shared/database/prisma.js';
import { generateDraw } from '../draw/draw.service.js';

export interface OnboardingInput {
  organizerName: string;
  tournamentName: string;
  playerNames: string[];
}

export interface OnboardingResult {
  organizerId: string;
  tournamentId: string;
  playerIds: string[];
}

export async function runOnboardingSetup(
  input: OnboardingInput
): Promise<OnboardingResult> {
  const { organizerName, tournamentName, playerNames } = input;

  if (!organizerName.trim()) {
    throw new OnboardingError('Organizer name is required', 400);
  }
  if (!tournamentName.trim()) {
    throw new OnboardingError('Tournament name is required', 400);
  }
  if (playerNames.length < 2) {
    throw new OnboardingError('At least 2 players are required', 400);
  }

  // Create organizer, tournament, and players in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const organizer = await tx.organizer.create({
      data: { name: organizerName.trim() },
    });

    const tournament = await tx.tournament.create({
      data: {
        name: tournamentName.trim(),
        organizerId: organizer.id,
        status: 'OPEN',
      },
    });

    const players = await Promise.all(
      playerNames.map((name) =>
        tx.player.create({ data: { name: name.trim() } })
      )
    );

    return {
      organizerId: organizer.id,
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
