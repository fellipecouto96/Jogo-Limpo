import { prisma } from '../../shared/database/prisma.js';
import { Decimal } from '@prisma/client/runtime/library';
import { generateDraw } from '../draw/draw.service.js';
import { calculateFinancials } from '../tournament/financials.js';

const DEFAULT_ORGANIZER_PERCENTAGE = 10;
const DEFAULT_CHAMPION_PERCENTAGE = 70;
const DEFAULT_RUNNER_UP_PERCENTAGE = 30;
const DEFAULT_THIRD_PLACE_PERCENTAGE = 0;

export interface OnboardingInput {
  organizerId: string;
  tournamentName: string;
  playerNames: string[];
  entryFee?: number;
  organizerPercentage?: number;
  championPercentage?: number;
  runnerUpPercentage?: number;
  thirdPlacePercentage?: number | null;
  firstPlacePercentage?: number;
  secondPlacePercentage?: number;
}

export interface OnboardingResult {
  organizerId: string;
  tournamentId: string;
  playerIds: string[];
}

export async function runOnboardingSetup(
  input: OnboardingInput
): Promise<OnboardingResult> {
  const {
    organizerId,
    tournamentName,
    playerNames,
    entryFee,
    organizerPercentage,
    championPercentage,
    runnerUpPercentage,
    thirdPlacePercentage,
    firstPlacePercentage,
    secondPlacePercentage,
  } = input;

  if (!tournamentName.trim()) {
    throw new OnboardingError('Tournament name is required', 400);
  }
  if (playerNames.length < 2) {
    throw new OnboardingError('At least 2 players are required', 400);
  }
  if (
    entryFee != null &&
    (!Number.isFinite(entryFee) || entryFee < 0)
  ) {
    throw new OnboardingError('Entry fee must be a non-negative number', 400);
  }

  if (
    organizerPercentage != null &&
    (!Number.isFinite(organizerPercentage) ||
      organizerPercentage < 0 ||
      organizerPercentage > 100)
  ) {
    throw new OnboardingError('Organizer percentage must be between 0 and 100', 400);
  }

  if (
    championPercentage != null &&
    (!Number.isFinite(championPercentage) ||
      championPercentage < 0 ||
      championPercentage > 100)
  ) {
    throw new OnboardingError('Champion percentage must be between 0 and 100', 400);
  }

  if (
    runnerUpPercentage != null &&
    (!Number.isFinite(runnerUpPercentage) ||
      runnerUpPercentage < 0 ||
      runnerUpPercentage > 100)
  ) {
    throw new OnboardingError('Runner-up percentage must be between 0 and 100', 400);
  }

  if (
    thirdPlacePercentage != null &&
    (!Number.isFinite(thirdPlacePercentage) ||
      thirdPlacePercentage < 0 ||
      thirdPlacePercentage > 100)
  ) {
    throw new OnboardingError('Third place percentage must be between 0 and 100', 400);
  }

  if (
    firstPlacePercentage != null &&
    (!Number.isFinite(firstPlacePercentage) ||
      firstPlacePercentage < 0 ||
      firstPlacePercentage > 100)
  ) {
    throw new OnboardingError('First place percentage must be between 0 and 100', 400);
  }

  if (
    secondPlacePercentage != null &&
    (!Number.isFinite(secondPlacePercentage) ||
      secondPlacePercentage < 0 ||
      secondPlacePercentage > 100)
  ) {
    throw new OnboardingError('Second place percentage must be between 0 and 100', 400);
  }

  const safeEntryFee = entryFee ?? 0;
  const safeOrganizerPercentage =
    organizerPercentage ?? DEFAULT_ORGANIZER_PERCENTAGE;
  const safeChampionPercentage =
    championPercentage ??
    firstPlacePercentage ??
    DEFAULT_CHAMPION_PERCENTAGE;
  const safeRunnerUpPercentage =
    runnerUpPercentage ??
    secondPlacePercentage ??
    DEFAULT_RUNNER_UP_PERCENTAGE;
  const safeThirdPlacePercentage =
    thirdPlacePercentage ?? DEFAULT_THIRD_PLACE_PERCENTAGE;

  if (
    Math.abs(
      safeChampionPercentage +
        safeRunnerUpPercentage +
        safeThirdPlacePercentage -
        100
    ) > 0.01
  ) {
    throw new OnboardingError(
      'Champion, runner-up and third place percentages must sum to 100',
      400
    );
  }

  const snapshot = calculateFinancials({
    entryFee: safeEntryFee,
    playerCount: playerNames.length,
    organizerPercentage: safeOrganizerPercentage,
    championPercentage: safeChampionPercentage,
    runnerUpPercentage: safeRunnerUpPercentage,
    thirdPlacePercentage: safeThirdPlacePercentage,
  });

  const result = await prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.create({
      data: {
        name: tournamentName.trim(),
        organizerId,
        status: 'OPEN',
        entryFee: new Decimal(safeEntryFee),
        organizerPercentage: new Decimal(safeOrganizerPercentage),
        championPercentage: new Decimal(safeChampionPercentage),
        runnerUpPercentage: new Decimal(safeRunnerUpPercentage),
        thirdPlacePercentage: new Decimal(safeThirdPlacePercentage),
        firstPlacePercentage: new Decimal(safeChampionPercentage),
        secondPlacePercentage: new Decimal(safeRunnerUpPercentage),
        totalCollected: new Decimal(snapshot.totalCollected),
        calculatedOrganizerAmount: new Decimal(snapshot.organizerAmount),
        calculatedPrizePool: new Decimal(snapshot.prizePool),
        prizePool: new Decimal(snapshot.prizePool),
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
