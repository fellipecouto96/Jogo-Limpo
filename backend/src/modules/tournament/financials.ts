export interface FinancialSnapshot {
  totalCollected: number;
  organizerAmount: number;
  prizePool: number;
  firstPlacePrize: number;
  secondPlacePrize: number;
}

export interface FinancialCalculationInput {
  entryFee: number;
  playerCount: number;
  organizerPercentage: number;
  firstPlacePercentage: number;
  secondPlacePercentage: number;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateFinancials(input: FinancialCalculationInput): FinancialSnapshot {
  const {
    entryFee,
    playerCount,
    organizerPercentage,
    firstPlacePercentage,
    secondPlacePercentage,
  } = input;

  const safePlayerCount = Math.max(playerCount, 0);
  const totalCollected = roundCurrency(entryFee * safePlayerCount);
  const organizerAmount = roundCurrency(totalCollected * (organizerPercentage / 100));
  const prizePool = roundCurrency(totalCollected - organizerAmount);
  const firstPlacePrize = roundCurrency(prizePool * (firstPlacePercentage / 100));
  const secondPlacePrize = roundCurrency(prizePool * (secondPlacePercentage / 100));

  return {
    totalCollected,
    organizerAmount,
    prizePool,
    firstPlacePrize,
    secondPlacePrize,
  };
}
