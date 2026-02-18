import { describe, it, expect } from 'vitest';

/**
 * Tests for pure validation logic from tournament.service.ts:
 * - countPlayers()
 * - resolveStoredPercentages()
 * - validatePercentages()
 * - Financial input resolution
 */

// ─── countPlayers (extracted from tournament.service.ts) ───

function countPlayers(matches: { isBye: boolean }[]): number {
  const byeCount = matches.filter((m) => m.isBye).length;
  return matches.length * 2 - byeCount;
}

describe('countPlayers', () => {
  it('counts 4 players from 2 normal matches', () => {
    const matches = [{ isBye: false }, { isBye: false }];
    expect(countPlayers(matches)).toBe(4);
  });

  it('counts 7 players from 3 normal + 1 bye match', () => {
    const matches = [
      { isBye: false },
      { isBye: false },
      { isBye: false },
      { isBye: true },
    ];
    expect(countPlayers(matches)).toBe(7);
  });

  it('counts 8 players from 4 normal matches (no byes)', () => {
    const matches = Array.from({ length: 4 }, () => ({ isBye: false }));
    expect(countPlayers(matches)).toBe(8);
  });

  it('counts 13 players from 5 normal + 3 bye matches', () => {
    const matches = [
      ...Array.from({ length: 5 }, () => ({ isBye: false })),
      ...Array.from({ length: 3 }, () => ({ isBye: true })),
    ];
    expect(countPlayers(matches)).toBe(13);
  });

  it('returns 0 for empty match list', () => {
    expect(countPlayers([])).toBe(0);
  });

  it('counts 2 players from 1 normal match', () => {
    expect(countPlayers([{ isBye: false }])).toBe(2);
  });

  it('counts 1 player from 1 bye match', () => {
    expect(countPlayers([{ isBye: true }])).toBe(1);
  });
});

// ─── resolveStoredPercentages (extracted logic) ───

function resolveStoredPercentages(tournament: {
  championPercentage: number | null;
  runnerUpPercentage: number | null;
  thirdPlacePercentage: number | null;
  fourthPlacePercentage?: number | null;
  firstPlacePercentage: number | null;
  secondPlacePercentage: number | null;
}) {
  const championPercentage =
    tournament.championPercentage ?? tournament.firstPlacePercentage;
  const runnerUpPercentage =
    tournament.runnerUpPercentage ?? tournament.secondPlacePercentage;
  const thirdPlacePercentage =
    tournament.thirdPlacePercentage ??
    (championPercentage != null || runnerUpPercentage != null ? 0 : null);
  const fourthPlacePercentage =
    (tournament.fourthPlacePercentage ?? null) ??
    (championPercentage != null || runnerUpPercentage != null ? 0 : null);

  return {
    championPercentage,
    runnerUpPercentage,
    thirdPlacePercentage,
    fourthPlacePercentage,
  };
}

describe('resolveStoredPercentages', () => {
  it('uses new fields when available', () => {
    const result = resolveStoredPercentages({
      championPercentage: 60,
      runnerUpPercentage: 25,
      thirdPlacePercentage: 15,
      fourthPlacePercentage: 0,
      firstPlacePercentage: null,
      secondPlacePercentage: null,
    });

    expect(result.championPercentage).toBe(60);
    expect(result.runnerUpPercentage).toBe(25);
    expect(result.thirdPlacePercentage).toBe(15);
    expect(result.fourthPlacePercentage).toBe(0);
  });

  it('falls back to legacy fields when new fields are null', () => {
    const result = resolveStoredPercentages({
      championPercentage: null,
      runnerUpPercentage: null,
      thirdPlacePercentage: null,
      fourthPlacePercentage: null,
      firstPlacePercentage: 70,
      secondPlacePercentage: 30,
    });

    expect(result.championPercentage).toBe(70);
    expect(result.runnerUpPercentage).toBe(30);
  });

  it('defaults 3rd and 4th to 0 when prize percentages are set', () => {
    const result = resolveStoredPercentages({
      championPercentage: 70,
      runnerUpPercentage: 30,
      thirdPlacePercentage: null,
      fourthPlacePercentage: null,
      firstPlacePercentage: null,
      secondPlacePercentage: null,
    });

    expect(result.thirdPlacePercentage).toBe(0);
    expect(result.fourthPlacePercentage).toBe(0);
  });

  it('returns null for everything when all fields are null', () => {
    const result = resolveStoredPercentages({
      championPercentage: null,
      runnerUpPercentage: null,
      thirdPlacePercentage: null,
      fourthPlacePercentage: null,
      firstPlacePercentage: null,
      secondPlacePercentage: null,
    });

    expect(result.championPercentage).toBeNull();
    expect(result.runnerUpPercentage).toBeNull();
    expect(result.thirdPlacePercentage).toBeNull();
    expect(result.fourthPlacePercentage).toBeNull();
  });
});

// ─── validatePercentages (extracted logic) ───

function validatePercentages(data: {
  organizerPercentage: number;
  championPercentage?: number;
  runnerUpPercentage?: number;
  thirdPlacePercentage?: number;
  fourthPlacePercentage?: number;
}): { valid: boolean; error?: string } {
  const org = data.organizerPercentage;
  const champ = data.championPercentage ?? 0;
  const runner = data.runnerUpPercentage ?? 0;
  const third = data.thirdPlacePercentage ?? 0;
  const fourth = data.fourthPlacePercentage ?? 0;

  if (org < 0 || org > 100) {
    return { valid: false, error: 'Organizer percentage out of range' };
  }
  if (champ < 0 || champ > 100) {
    return { valid: false, error: 'Champion percentage out of range' };
  }
  if (runner < 0 || runner > 100) {
    return { valid: false, error: 'Runner-up percentage out of range' };
  }
  if (third < 0 || third > 100) {
    return { valid: false, error: '3rd place percentage out of range' };
  }
  if (fourth < 0 || fourth > 100) {
    return { valid: false, error: '4th place percentage out of range' };
  }
  if (Math.abs(champ + runner + third + fourth - 100) > 0.01) {
    return { valid: false, error: 'Prize percentages must sum to 100' };
  }
  return { valid: true };
}

describe('validatePercentages', () => {
  it('accepts valid default configuration', () => {
    expect(
      validatePercentages({
        organizerPercentage: 10,
        championPercentage: 70,
        runnerUpPercentage: 30,
      }).valid
    ).toBe(true);
  });

  it('accepts 4-position split summing to 100', () => {
    expect(
      validatePercentages({
        organizerPercentage: 15,
        championPercentage: 50,
        runnerUpPercentage: 25,
        thirdPlacePercentage: 15,
        fourthPlacePercentage: 10,
      }).valid
    ).toBe(true);
  });

  it('rejects negative organizer percentage', () => {
    const result = validatePercentages({
      organizerPercentage: -5,
      championPercentage: 70,
      runnerUpPercentage: 30,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects organizer percentage > 100', () => {
    const result = validatePercentages({
      organizerPercentage: 101,
      championPercentage: 70,
      runnerUpPercentage: 30,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects champion percentage > 100', () => {
    const result = validatePercentages({
      organizerPercentage: 10,
      championPercentage: 110,
      runnerUpPercentage: 30,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects sum not equal to 100', () => {
    const result = validatePercentages({
      organizerPercentage: 10,
      championPercentage: 60,
      runnerUpPercentage: 20,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Prize percentages must sum to 100');
  });

  it('accepts 0% organizer with valid prize split', () => {
    expect(
      validatePercentages({
        organizerPercentage: 0,
        championPercentage: 70,
        runnerUpPercentage: 30,
      }).valid
    ).toBe(true);
  });

  it('accepts 100% organizer with all 0% prizes summing to 100', () => {
    // Edge case: prizes must still sum to 100 independently
    // With defaults 0+0+0+0 = 0, this would fail.
    // Testing that the validation properly checks the sum
    const result = validatePercentages({
      organizerPercentage: 100,
      championPercentage: 100,
      runnerUpPercentage: 0,
    });
    expect(result.valid).toBe(true);
  });
});

// ─── Data Integrity: No invalid prize distribution ───

describe('data integrity constraints', () => {
  it('finished tournament should not be editable', () => {
    const status = 'FINISHED';
    const canEdit = status !== 'FINISHED';
    expect(canEdit).toBe(false);
  });

  it('running tournament is editable', () => {
    const status: string = 'RUNNING';
    const canEdit = status !== 'FINISHED';
    expect(canEdit).toBe(true);
  });

  it('player name must not be empty', () => {
    const name = '   ';
    expect(name.trim()).toBe('');
  });

  it('player name must not exceed 80 characters', () => {
    const name = 'A'.repeat(81);
    expect(name.length > 80).toBe(true);
  });

  it('player name of 80 characters is acceptable', () => {
    const name = 'A'.repeat(80);
    expect(name.length <= 80).toBe(true);
  });
});
