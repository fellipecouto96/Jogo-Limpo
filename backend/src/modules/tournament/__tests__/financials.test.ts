import { describe, it, expect } from 'vitest';
import { calculateFinancials } from '../financials.js';

describe('calculateFinancials', () => {
  it('computes totals with rounding to cents', () => {
    const result = calculateFinancials({
      entryFee: 25.5,
      playerCount: 16,
      organizerPercentage: 10,
      championPercentage: 70,
      runnerUpPercentage: 30,
    });

    expect(result.totalCollected).toBe(408);
    expect(result.organizerAmount).toBe(40.8);
    expect(result.prizePool).toBe(367.2);
    expect(result.championPrize).toBe(257.04);
    expect(result.runnerUpPrize).toBe(110.16);
    expect(result.thirdPlacePrize).toBe(0);
    expect(result.firstPlacePrize).toBe(257.04);
    expect(result.secondPlacePrize).toBe(110.16);
  });

  it('handles zero players safely', () => {
    const result = calculateFinancials({
      entryFee: 100,
      playerCount: 0,
      organizerPercentage: 15,
      championPercentage: 70,
      runnerUpPercentage: 30,
    });

    expect(result).toEqual({
      totalCollected: 0,
      organizerAmount: 0,
      prizePool: 0,
      championPrize: 0,
      runnerUpPrize: 0,
      thirdPlacePrize: 0,
      firstPlacePrize: 0,
      secondPlacePrize: 0,
    });
  });

  it('supports optional third place split', () => {
    const result = calculateFinancials({
      entryFee: 20,
      playerCount: 10,
      organizerPercentage: 10,
      championPercentage: 60,
      runnerUpPercentage: 25,
      thirdPlacePercentage: 15,
    });

    expect(result.totalCollected).toBe(200);
    expect(result.organizerAmount).toBe(20);
    expect(result.prizePool).toBe(180);
    expect(result.championPrize).toBe(108);
    expect(result.runnerUpPrize).toBe(45);
    expect(result.thirdPlacePrize).toBe(27);
  });
});
