import { describe, it, expect } from 'vitest';

/**
 * Tests for the onboarding validation rules extracted from onboarding.service.ts.
 * These run without a database connection by testing the pure validation logic.
 */

interface OnboardingInput {
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

function validateOnboardingInput(input: OnboardingInput): {
  valid: boolean;
  error?: string;
} {
  if (!input.tournamentName.trim()) {
    return { valid: false, error: 'Tournament name is required' };
  }
  if (input.playerNames.length < 2) {
    return { valid: false, error: 'At least 2 players are required' };
  }
  if (
    input.entryFee != null &&
    (!Number.isFinite(input.entryFee) || input.entryFee < 0)
  ) {
    return { valid: false, error: 'Entry fee must be a non-negative number' };
  }

  const fields: Array<{
    name: string;
    value: number | null | undefined;
  }> = [
    { name: 'Organizer', value: input.organizerPercentage },
    { name: 'Champion', value: input.championPercentage },
    { name: 'Runner-up', value: input.runnerUpPercentage },
    { name: 'Third place', value: input.thirdPlacePercentage },
    { name: 'Fourth place', value: input.fourthPlacePercentage },
    { name: 'First place', value: input.firstPlacePercentage },
    { name: 'Second place', value: input.secondPlacePercentage },
  ];

  for (const field of fields) {
    if (
      field.value != null &&
      (!Number.isFinite(field.value) || field.value < 0 || field.value > 100)
    ) {
      return {
        valid: false,
        error: `${field.name} percentage must be between 0 and 100`,
      };
    }
  }

  // Check sum
  const champion = input.championPercentage ?? input.firstPlacePercentage ?? 70;
  const runnerUp =
    input.runnerUpPercentage ?? input.secondPlacePercentage ?? 30;
  const third = input.thirdPlacePercentage ?? 0;
  const fourth = input.fourthPlacePercentage ?? 0;

  if (Math.abs(champion + runnerUp + third + fourth - 100) > 0.01) {
    return {
      valid: false,
      error: 'Percentages must sum to 100',
    };
  }

  return { valid: true };
}

describe('onboarding input validation', () => {
  // ─── Tournament Creation Basics ──────────────
  it('accepts valid minimal input', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
    });
    expect(result.valid).toBe(true);
  });

  it('rejects empty tournament name', () => {
    const result = validateOnboardingInput({
      tournamentName: '',
      playerNames: ['Alice', 'Bob'],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Tournament name is required');
  });

  it('rejects whitespace-only tournament name', () => {
    const result = validateOnboardingInput({
      tournamentName: '   ',
      playerNames: ['Alice', 'Bob'],
    });
    expect(result.valid).toBe(false);
  });

  it('rejects fewer than 2 players', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice'],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('At least 2 players are required');
  });

  it('rejects zero players', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: [],
    });
    expect(result.valid).toBe(false);
  });

  it('accepts exactly 2 players', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
    });
    expect(result.valid).toBe(true);
  });

  // ─── Entry Fee Validation ──────────────
  it('accepts zero entry fee', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
      entryFee: 0,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects negative entry fee', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
      entryFee: -10,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects NaN entry fee', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
      entryFee: NaN,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects Infinity entry fee', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
      entryFee: Infinity,
    });
    expect(result.valid).toBe(false);
  });

  // ─── Percentage Validation ──────────────
  it('rejects organizer percentage > 100', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
      organizerPercentage: 150,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects negative champion percentage', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
      championPercentage: -10,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects NaN percentage', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
      championPercentage: NaN,
    });
    expect(result.valid).toBe(false);
  });

  // ─── Percentage Sum Validation ──────────────
  it('accepts percentages summing to 100', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
      championPercentage: 60,
      runnerUpPercentage: 25,
      thirdPlacePercentage: 15,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects percentages not summing to 100', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
      championPercentage: 60,
      runnerUpPercentage: 20,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Percentages must sum to 100');
  });

  it('accepts four-position split summing to 100', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob', 'Charlie', 'Diana'],
      championPercentage: 50,
      runnerUpPercentage: 25,
      thirdPlacePercentage: 15,
      fourthPlacePercentage: 10,
    });
    expect(result.valid).toBe(true);
  });

  it('accepts default percentages when none specified', () => {
    // Defaults: champion 70%, runner-up 30%
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
    });
    expect(result.valid).toBe(true);
  });

  it('tolerates floating point imprecision (≤ 0.01)', () => {
    const result = validateOnboardingInput({
      tournamentName: 'Copa',
      playerNames: ['Alice', 'Bob'],
      championPercentage: 33.33,
      runnerUpPercentage: 33.33,
      thirdPlacePercentage: 33.34,
    });
    expect(result.valid).toBe(true);
  });
});

describe('duplicate player detection', () => {
  function detectDuplicates(playerNames: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const name of playerNames) {
      const lower = name.toLowerCase();
      if (seen.has(lower)) {
        duplicates.add(name);
      }
      seen.add(lower);
    }
    return Array.from(duplicates);
  }

  it('detects no duplicates in unique list', () => {
    expect(detectDuplicates(['Alice', 'Bob', 'Charlie'])).toEqual([]);
  });

  it('detects exact duplicates', () => {
    expect(detectDuplicates(['Alice', 'Bob', 'Alice'])).toEqual(['Alice']);
  });

  it('detects case-insensitive duplicates', () => {
    expect(detectDuplicates(['Alice', 'alice'])).toEqual(['alice']);
  });

  it('handles empty list', () => {
    expect(detectDuplicates([])).toEqual([]);
  });

  it('handles single player', () => {
    expect(detectDuplicates(['Alice'])).toEqual([]);
  });
});
