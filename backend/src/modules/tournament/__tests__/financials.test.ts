import { describe, it, expect } from 'vitest';
import { calculateFinancials } from '../financials.js';

describe('calculateFinancials', () => {
  it('computes totals with rounding to cents', () => {
    const result = calculateFinancials({
      entryFee: 25.5,
      playerCount: 16,
      organizerPercentage: 10,
      firstPlacePercentage: 70,
      secondPlacePercentage: 30,
    });

    expect(result.totalCollected).toBe(408);
    expect(result.organizerAmount).toBe(40.8);
    expect(result.prizePool).toBe(367.2);
    expect(result.firstPlacePrize).toBe(257.04);
    expect(result.secondPlacePrize).toBe(110.16);
  });

  it('handles zero players safely', () => {
    const result = calculateFinancials({
      entryFee: 100,
      playerCount: 0,
      organizerPercentage: 15,
      firstPlacePercentage: 70,
      secondPlacePercentage: 30,
    });

    expect(result).toEqual({
      totalCollected: 0,
      organizerAmount: 0,
      prizePool: 0,
      firstPlacePrize: 0,
      secondPlacePrize: 0,
    });
  });
});
