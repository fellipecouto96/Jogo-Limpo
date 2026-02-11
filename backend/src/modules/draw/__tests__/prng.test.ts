import { describe, it, expect } from 'vitest';
import { deterministicShuffle } from '../../../shared/utils/prng.js';

describe('deterministicShuffle', () => {
  const players = [
    'player-a',
    'player-b',
    'player-c',
    'player-d',
    'player-e',
    'player-f',
    'player-g',
    'player-h',
  ];

  it('produces the same output for the same seed', () => {
    const seed = 'test-seed-abc123';
    const first = deterministicShuffle(players, seed);
    const second = deterministicShuffle(players, seed);

    expect(first).toEqual(second);
  });

  it('produces different output for different seeds', () => {
    const result1 = deterministicShuffle(players, 'seed-one');
    const result2 = deterministicShuffle(players, 'seed-two');

    expect(result1).not.toEqual(result2);
  });

  it('does not modify the original array', () => {
    const original = [...players];
    deterministicShuffle(players, 'any-seed');

    expect(players).toEqual(original);
  });

  it('preserves all elements (no duplicates, no missing)', () => {
    const result = deterministicShuffle(players, 'check-integrity');

    expect(result.sort()).toEqual([...players].sort());
    expect(result.length).toBe(players.length);
  });

  it('is reproducible across 1000 iterations', () => {
    const seed = 'stress-test-seed';
    const baseline = deterministicShuffle(players, seed);

    for (let i = 0; i < 1000; i++) {
      expect(deterministicShuffle(players, seed)).toEqual(baseline);
    }
  });
});
