export interface FinancialSnapshot {
  totalCollected: number;
  organizerAmount: number;
  prizePool: number;
  championPrize: number;
  runnerUpPrize: number;
  thirdPlacePrize: number;
  firstPlacePrize: number;
  secondPlacePrize: number;
}

export interface FinancialCalculationInput {
  entryFee: number;
  playerCount: number;
  organizerPercentage: number;
  championPercentage?: number;
  runnerUpPercentage?: number;
  thirdPlacePercentage?: number;
  firstPlacePercentage?: number;
  secondPlacePercentage?: number;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateFinancials(input: FinancialCalculationInput): FinancialSnapshot {
  const {
    entryFee,
    playerCount,
    organizerPercentage,
    championPercentage,
    runnerUpPercentage,
    thirdPlacePercentage,
    firstPlacePercentage,
    secondPlacePercentage,
  } = input;

  const safeChampionPercentage = championPercentage ?? firstPlacePercentage ?? 70;
  const safeRunnerUpPercentage = runnerUpPercentage ?? secondPlacePercentage ?? 30;
  const safeThirdPlacePercentage = thirdPlacePercentage ?? 0;

  const safePlayerCount = Math.max(playerCount, 0);
  const totalCollected = roundCurrency(entryFee * safePlayerCount);
  const organizerAmount = roundCurrency(totalCollected * (organizerPercentage / 100));
  const prizePool = roundCurrency(totalCollected - organizerAmount);
  const championPrize = roundCurrency(prizePool * (safeChampionPercentage / 100));
  const runnerUpPrize = roundCurrency(prizePool * (safeRunnerUpPercentage / 100));
  const thirdPlacePrize = roundCurrency(prizePool * (safeThirdPlacePercentage / 100));

  return {
    totalCollected,
    organizerAmount,
    prizePool,
    championPrize,
    runnerUpPrize,
    thirdPlacePrize,
    firstPlacePrize: championPrize,
    secondPlacePrize: runnerUpPrize,
  };
}
