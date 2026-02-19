import { prisma } from '../../shared/database/prisma.js';
import { Decimal } from '@prisma/client/runtime/library';
import { generateDraw } from '../draw/draw.service.js';
import { calculateFinancials } from '../tournament/financials.js';
import { generateUniqueTournamentSlug } from '../tournament/public-slug.js';

const DEFAULT_ORGANIZER_PERCENTAGE = 10;
const DEFAULT_CHAMPION_PERCENTAGE = 70;
const DEFAULT_RUNNER_UP_PERCENTAGE = 30;
const DEFAULT_THIRD_PLACE_PERCENTAGE = 0;
const DEFAULT_FOURTH_PLACE_PERCENTAGE = 0;

export interface OnboardingInput {
  organizerId: string;
  tournamentName: string;
  playerNames: string[];
  entryFee?: number;
  organizerPercentage?: number;
  championPercentage?: number;
  runnerUpPercentage?: number;
  thirdPlacePercentage?: number | null;
  fourthPlacePercentage?: number | null;
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
    fourthPlacePercentage,
    firstPlacePercentage,
    secondPlacePercentage,
  } = input;

  if (!tournamentName.trim()) {
    throw new OnboardingError('Nome do torneio e obrigatorio', 400);
  }
  if (playerNames.length < 2) {
    throw new OnboardingError('Torneio precisa de pelo menos 2 jogadores para sortear', 400);
  }
  if (
    entryFee != null &&
    (!Number.isFinite(entryFee) || entryFee < 0)
  ) {
    throw new OnboardingError('Taxa de inscricao deve ser um numero maior ou igual a zero', 400);
  }

  if (
    organizerPercentage != null &&
    (!Number.isFinite(organizerPercentage) ||
      organizerPercentage < 0 ||
      organizerPercentage > 100)
  ) {
    throw new OnboardingError('Percentual do organizador deve ser entre 0 e 100', 400);
  }

  if (
    championPercentage != null &&
    (!Number.isFinite(championPercentage) ||
      championPercentage < 0 ||
      championPercentage > 100)
  ) {
    throw new OnboardingError('Percentual do campeao deve ser entre 0 e 100', 400);
  }

  if (
    runnerUpPercentage != null &&
    (!Number.isFinite(runnerUpPercentage) ||
      runnerUpPercentage < 0 ||
      runnerUpPercentage > 100)
  ) {
    throw new OnboardingError('Percentual do vice deve ser entre 0 e 100', 400);
  }

  if (
    thirdPlacePercentage != null &&
    (!Number.isFinite(thirdPlacePercentage) ||
      thirdPlacePercentage < 0 ||
      thirdPlacePercentage > 100)
  ) {
    throw new OnboardingError('Percentual do 3o lugar deve ser entre 0 e 100', 400);
  }

  if (
    fourthPlacePercentage != null &&
    (!Number.isFinite(fourthPlacePercentage) ||
      fourthPlacePercentage < 0 ||
      fourthPlacePercentage > 100)
  ) {
    throw new OnboardingError('Percentual do 4o lugar deve ser entre 0 e 100', 400);
  }

  if (
    firstPlacePercentage != null &&
    (!Number.isFinite(firstPlacePercentage) ||
      firstPlacePercentage < 0 ||
      firstPlacePercentage > 100)
  ) {
    throw new OnboardingError('Percentual do 1o lugar deve ser entre 0 e 100', 400);
  }

  if (
    secondPlacePercentage != null &&
    (!Number.isFinite(secondPlacePercentage) ||
      secondPlacePercentage < 0 ||
      secondPlacePercentage > 100)
  ) {
    throw new OnboardingError('Percentual do 2o lugar deve ser entre 0 e 100', 400);
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
  const safeFourthPlacePercentage =
    fourthPlacePercentage ?? DEFAULT_FOURTH_PLACE_PERCENTAGE;

  if (
    Math.abs(
      safeChampionPercentage +
        safeRunnerUpPercentage +
        safeThirdPlacePercentage +
        safeFourthPlacePercentage -
        100
    ) > 0.01
  ) {
    throw new OnboardingError(
      'A divisao da premiacao precisa fechar 100%',
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
    fourthPlacePercentage: safeFourthPlacePercentage,
  });

  const result = await prisma.$transaction(async (tx) => {
    const publicSlug = await generateUniqueTournamentSlug(
      tournamentName.trim(),
      async (slug) => {
        const existing = await tx.tournament.findUnique({
          where: { publicSlug: slug },
          select: { id: true },
        });
        return Boolean(existing);
      }
    );

    const tournament = await tx.tournament.create({
      data: {
        name: tournamentName.trim(),
        publicSlug,
        organizerId,
        status: 'OPEN',
        entryFee: new Decimal(safeEntryFee),
        organizerPercentage: new Decimal(safeOrganizerPercentage),
        championPercentage: new Decimal(safeChampionPercentage),
        runnerUpPercentage: new Decimal(safeRunnerUpPercentage),
        thirdPlacePercentage: new Decimal(safeThirdPlacePercentage),
        fourthPlacePercentage: new Decimal(safeFourthPlacePercentage),
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
