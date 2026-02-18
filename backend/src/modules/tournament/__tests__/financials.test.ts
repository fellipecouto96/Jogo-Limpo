import { describe, it, expect } from 'vitest';
import { calculateFinancials } from '../financials.js';

describe('calculateFinancials', () => {
  // ─── Default 1st + 2nd only ─────────────────────
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
    expect(result.fourthPlacePrize).toBe(0);
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

    expect(result.totalCollected).toBe(0);
    expect(result.organizerAmount).toBe(0);
    expect(result.prizePool).toBe(0);
    expect(result.championPrize).toBe(0);
    expect(result.runnerUpPrize).toBe(0);
  });

  it('handles negative player count as zero', () => {
    const result = calculateFinancials({
      entryFee: 100,
      playerCount: -5,
      organizerPercentage: 10,
      championPercentage: 70,
      runnerUpPercentage: 30,
    });

    expect(result.totalCollected).toBe(0);
    expect(result.prizePool).toBe(0);
  });

  it('handles zero entry fee (free tournament)', () => {
    const result = calculateFinancials({
      entryFee: 0,
      playerCount: 8,
      organizerPercentage: 10,
      championPercentage: 70,
      runnerUpPercentage: 30,
    });

    expect(result.totalCollected).toBe(0);
    expect(result.organizerAmount).toBe(0);
    expect(result.prizePool).toBe(0);
    expect(result.championPrize).toBe(0);
  });

  it('handles 0% organizer cut (all goes to prize pool)', () => {
    const result = calculateFinancials({
      entryFee: 100,
      playerCount: 10,
      organizerPercentage: 0,
      championPercentage: 70,
      runnerUpPercentage: 30,
    });

    expect(result.totalCollected).toBe(1000);
    expect(result.organizerAmount).toBe(0);
    expect(result.prizePool).toBe(1000);
    expect(result.championPrize).toBe(700);
    expect(result.runnerUpPrize).toBe(300);
  });

  it('handles 100% organizer cut (no prize pool)', () => {
    const result = calculateFinancials({
      entryFee: 50,
      playerCount: 8,
      organizerPercentage: 100,
      championPercentage: 70,
      runnerUpPercentage: 30,
    });

    expect(result.totalCollected).toBe(400);
    expect(result.organizerAmount).toBe(400);
    expect(result.prizePool).toBe(0);
    expect(result.championPrize).toBe(0);
    expect(result.runnerUpPrize).toBe(0);
  });

  // ─── 3rd place enabled ─────────────────────
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
    expect(result.fourthPlacePrize).toBe(0);
  });

  // ─── 4th place enabled ─────────────────────
  it('supports four-position prize split', () => {
    const result = calculateFinancials({
      entryFee: 50,
      playerCount: 16,
      organizerPercentage: 10,
      championPercentage: 50,
      runnerUpPercentage: 25,
      thirdPlacePercentage: 15,
      fourthPlacePercentage: 10,
    });

    expect(result.totalCollected).toBe(800);
    expect(result.organizerAmount).toBe(80);
    expect(result.prizePool).toBe(720);
    expect(result.championPrize).toBe(360);
    expect(result.runnerUpPrize).toBe(180);
    expect(result.thirdPlacePrize).toBe(108);
    expect(result.fourthPlacePrize).toBe(72);
    expect(result.firstPlacePrize).toBe(360);
    expect(result.secondPlacePrize).toBe(180);
  });

  // ─── Organizer percentage deducted FIRST ─────────
  it('deducts organizer percentage before prize distribution', () => {
    const result = calculateFinancials({
      entryFee: 100,
      playerCount: 10,
      organizerPercentage: 20,
      championPercentage: 70,
      runnerUpPercentage: 30,
    });

    // Total = 1000, Organizer = 200, Prize Pool = 800
    expect(result.totalCollected).toBe(1000);
    expect(result.organizerAmount).toBe(200);
    expect(result.prizePool).toBe(800);
    // Champion gets 70% of 800, not 70% of 1000
    expect(result.championPrize).toBe(560);
    expect(result.runnerUpPrize).toBe(240);
  });

  // ─── Legacy field aliasing ─────────────────
  it('falls back to firstPlacePercentage when championPercentage is absent', () => {
    const result = calculateFinancials({
      entryFee: 50,
      playerCount: 8,
      organizerPercentage: 10,
      firstPlacePercentage: 60,
      secondPlacePercentage: 40,
    });

    expect(result.prizePool).toBe(360);
    expect(result.championPrize).toBe(216); // 360 * 0.60
    expect(result.runnerUpPrize).toBe(144); // 360 * 0.40
    expect(result.firstPlacePrize).toBe(216);
    expect(result.secondPlacePrize).toBe(144);
  });

  it('uses default 70/30 when no prize percentages provided', () => {
    const result = calculateFinancials({
      entryFee: 100,
      playerCount: 4,
      organizerPercentage: 0,
    });

    expect(result.prizePool).toBe(400);
    expect(result.championPrize).toBe(280); // 70%
    expect(result.runnerUpPrize).toBe(120); // 30%
  });

  // ─── Financial preview equals final calculation ──
  it('frontend preview matches backend calculation', () => {
    // Simulate the frontend calculatePreview logic
    const entryFee = 30;
    const playerCount = 12;
    const organizerPercentage = 15;
    const championPercentage = 55;
    const runnerUpPercentage = 25;
    const thirdPlacePercentage = 20;

    const roundCurrency = (v: number) => Math.round(v * 100) / 100;
    const totalCollected = roundCurrency(entryFee * playerCount);
    const organizerAmount = roundCurrency(totalCollected * (organizerPercentage / 100));
    const prizePool = roundCurrency(totalCollected - organizerAmount);

    const backend = calculateFinancials({
      entryFee,
      playerCount,
      organizerPercentage,
      championPercentage,
      runnerUpPercentage,
      thirdPlacePercentage,
    });

    expect(backend.totalCollected).toBe(totalCollected);
    expect(backend.organizerAmount).toBe(organizerAmount);
    expect(backend.prizePool).toBe(prizePool);
    expect(backend.championPrize).toBe(roundCurrency(prizePool * championPercentage / 100));
    expect(backend.runnerUpPrize).toBe(roundCurrency(prizePool * runnerUpPercentage / 100));
    expect(backend.thirdPlacePrize).toBe(roundCurrency(prizePool * thirdPlacePercentage / 100));
  });

  // ─── Rounding edge cases ─────────────────────
  it('handles fractional cents correctly', () => {
    const result = calculateFinancials({
      entryFee: 33.33,
      playerCount: 3,
      organizerPercentage: 10,
      championPercentage: 70,
      runnerUpPercentage: 30,
    });

    // 33.33 * 3 = 99.99
    expect(result.totalCollected).toBe(99.99);
    expect(result.organizerAmount).toBe(10);
    expect(result.prizePool).toBe(89.99);
    // Values should be rounded to 2 decimal places
    expect(String(result.championPrize).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
    expect(String(result.runnerUpPrize).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });

  it('ensures no negative financial values in any normal configuration', () => {
    const configs = [
      { entryFee: 0, playerCount: 0, organizerPercentage: 0 },
      { entryFee: 1, playerCount: 1, organizerPercentage: 50 },
      { entryFee: 999, playerCount: 32, organizerPercentage: 99 },
    ];

    for (const config of configs) {
      const result = calculateFinancials({
        ...config,
        championPercentage: 70,
        runnerUpPercentage: 30,
      });

      expect(result.totalCollected).toBeGreaterThanOrEqual(0);
      expect(result.organizerAmount).toBeGreaterThanOrEqual(0);
      expect(result.prizePool).toBeGreaterThanOrEqual(0);
      expect(result.championPrize).toBeGreaterThanOrEqual(0);
      expect(result.runnerUpPrize).toBeGreaterThanOrEqual(0);
      expect(result.thirdPlacePrize).toBeGreaterThanOrEqual(0);
      expect(result.fourthPlacePrize).toBeGreaterThanOrEqual(0);
    }
  });
});
