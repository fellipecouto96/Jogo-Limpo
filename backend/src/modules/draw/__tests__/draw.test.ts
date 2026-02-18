import { describe, it, expect } from 'vitest';
import { nextPowerOfTwo } from '../draw.service.js';
import { deterministicShuffle } from '../../../shared/utils/prng.js';

describe('nextPowerOfTwo', () => {
  it('returns same value for exact powers of two', () => {
    expect(nextPowerOfTwo(2)).toBe(2);
    expect(nextPowerOfTwo(4)).toBe(4);
    expect(nextPowerOfTwo(8)).toBe(8);
    expect(nextPowerOfTwo(16)).toBe(16);
    expect(nextPowerOfTwo(32)).toBe(32);
  });

  it('rounds up non-power-of-two values', () => {
    expect(nextPowerOfTwo(3)).toBe(4);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(6)).toBe(8);
    expect(nextPowerOfTwo(7)).toBe(8);
    expect(nextPowerOfTwo(9)).toBe(16);
    expect(nextPowerOfTwo(13)).toBe(16);
    expect(nextPowerOfTwo(17)).toBe(32);
  });
});

describe('bracket structure for 7 players', () => {
  const playerIds = Array.from({ length: 7 }, (_, i) => `player-${i + 1}`);
  const seed = 'seven-player-seed';
  const shuffled = deterministicShuffle(playerIds, seed);

  const bracketSize = nextPowerOfTwo(7); // 8
  const totalRounds = Math.log2(bracketSize); // 3
  const totalFirstRoundSlots = bracketSize / 2; // 4
  const byeCount = bracketSize - 7; // 1
  const normalMatchCount = totalFirstRoundSlots - byeCount; // 3

  it('calculates correct bracket dimensions', () => {
    expect(bracketSize).toBe(8);
    expect(totalRounds).toBe(3);
    expect(totalFirstRoundSlots).toBe(4);
    expect(byeCount).toBe(1);
    expect(normalMatchCount).toBe(3);
  });

  it('assigns players to normal matches correctly', () => {
    // First 3 matches get 2 players each (6 players consumed)
    for (let slot = 0; slot < normalMatchCount; slot++) {
      const p1 = shuffled[slot * 2];
      const p2 = shuffled[slot * 2 + 1];
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();
      expect(p1).not.toBe(p2);
    }
  });

  it('assigns the remaining player to a bye match', () => {
    // Last player (index 6) gets the bye
    const byePlayer = shuffled[normalMatchCount * 2];
    expect(byePlayer).toBeDefined();
    expect(playerIds).toContain(byePlayer);
  });

  it('accounts for all 7 players exactly once', () => {
    const normalPlayers = shuffled.slice(0, normalMatchCount * 2);
    const byePlayers = shuffled.slice(normalMatchCount * 2);

    const allAssigned = [...normalPlayers, ...byePlayers];
    expect(allAssigned.length).toBe(7);
    expect(new Set(allAssigned).size).toBe(7);
    expect(allAssigned.sort()).toEqual([...playerIds].sort());
  });

  it('produces correct player count from match data', () => {
    // countPlayers formula: matches.length * 2 - byeCount
    const totalMatches = totalFirstRoundSlots; // 4
    const playerCount = totalMatches * 2 - byeCount;
    expect(playerCount).toBe(7);
  });
});

describe('bracket structure for 13 players', () => {
  const playerIds = Array.from({ length: 13 }, (_, i) => `player-${i + 1}`);
  const seed = 'thirteen-player-seed';
  const shuffled = deterministicShuffle(playerIds, seed);

  const bracketSize = nextPowerOfTwo(13); // 16
  const totalRounds = Math.log2(bracketSize); // 4
  const totalFirstRoundSlots = bracketSize / 2; // 8
  const byeCount = bracketSize - 13; // 3
  const normalMatchCount = totalFirstRoundSlots - byeCount; // 5

  it('calculates correct bracket dimensions', () => {
    expect(bracketSize).toBe(16);
    expect(totalRounds).toBe(4);
    expect(totalFirstRoundSlots).toBe(8);
    expect(byeCount).toBe(3);
    expect(normalMatchCount).toBe(5);
  });

  it('assigns 10 players to 5 normal matches', () => {
    for (let slot = 0; slot < normalMatchCount; slot++) {
      const p1 = shuffled[slot * 2];
      const p2 = shuffled[slot * 2 + 1];
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();
      expect(p1).not.toBe(p2);
    }
  });

  it('assigns 3 players to bye matches', () => {
    const byeStartIndex = normalMatchCount * 2; // 10
    const byePlayers = shuffled.slice(byeStartIndex, byeStartIndex + byeCount);
    expect(byePlayers.length).toBe(3);
    byePlayers.forEach((p) => {
      expect(playerIds).toContain(p);
    });
  });

  it('accounts for all 13 players exactly once', () => {
    const normalPlayers = shuffled.slice(0, normalMatchCount * 2);
    const byePlayers = shuffled.slice(normalMatchCount * 2);

    const allAssigned = [...normalPlayers, ...byePlayers];
    expect(allAssigned.length).toBe(13);
    expect(new Set(allAssigned).size).toBe(13);
    expect(allAssigned.sort()).toEqual([...playerIds].sort());
  });

  it('produces correct player count from match data', () => {
    const totalMatches = totalFirstRoundSlots; // 8
    const playerCount = totalMatches * 2 - byeCount;
    expect(playerCount).toBe(13);
  });
});

describe('deterministic reproducibility', () => {
  const playerIds = Array.from({ length: 7 }, (_, i) => `p-${i + 1}`);
  const seed = 'reproducibility-test-seed';

  it('produces identical bracket layout with the same seed', () => {
    const shuffled1 = deterministicShuffle(playerIds, seed);
    const shuffled2 = deterministicShuffle(playerIds, seed);

    expect(shuffled1).toEqual(shuffled2);

    // Same bracket dimensions
    const bracketSize = nextPowerOfTwo(playerIds.length);
    const byeCount = bracketSize - playerIds.length;
    const normalMatchCount = bracketSize / 2 - byeCount;

    // Same match assignments
    for (let i = 0; i < normalMatchCount; i++) {
      expect(shuffled1[i * 2]).toBe(shuffled2[i * 2]);
      expect(shuffled1[i * 2 + 1]).toBe(shuffled2[i * 2 + 1]);
    }

    // Same bye assignments
    for (let i = 0; i < byeCount; i++) {
      expect(shuffled1[normalMatchCount * 2 + i]).toBe(
        shuffled2[normalMatchCount * 2 + i]
      );
    }
  });

  it('produces different layout with a different seed', () => {
    const layout1 = deterministicShuffle(playerIds, 'seed-alpha');
    const layout2 = deterministicShuffle(playerIds, 'seed-beta');

    expect(layout1).not.toEqual(layout2);
  });

  it('is stable across 100 iterations', () => {
    const baseline = deterministicShuffle(playerIds, seed);
    for (let i = 0; i < 100; i++) {
      expect(deterministicShuffle(playerIds, seed)).toEqual(baseline);
    }
  });
});

describe('edge cases', () => {
  it('handles exactly 2 players (no byes needed)', () => {
    const bracketSize = nextPowerOfTwo(2);
    expect(bracketSize).toBe(2);
    expect(bracketSize - 2).toBe(0); // 0 byes
    expect(Math.log2(bracketSize)).toBe(1); // 1 round (final)
  });

  it('handles 3 players (1 bye)', () => {
    const bracketSize = nextPowerOfTwo(3);
    expect(bracketSize).toBe(4);
    expect(bracketSize - 3).toBe(1); // 1 bye
    expect(Math.log2(bracketSize)).toBe(2); // 2 rounds
  });

  it('handles 16 players (exact power of two, no byes)', () => {
    const bracketSize = nextPowerOfTwo(16);
    expect(bracketSize).toBe(16);
    expect(bracketSize - 16).toBe(0); // 0 byes
    expect(Math.log2(bracketSize)).toBe(4); // 4 rounds
  });

  it('handles 17 players (15 byes, next bracket is 32)', () => {
    const bracketSize = nextPowerOfTwo(17);
    expect(bracketSize).toBe(32);
    expect(bracketSize - 17).toBe(15); // 15 byes
    expect(Math.log2(bracketSize)).toBe(5); // 5 rounds
  });
});

describe('multi-round BYE pairing logic', () => {
  /**
   * Simulates the pairing loop from recordMatchResult() to verify
   * correct behavior for even and odd winner counts.
   */
  function buildNextRoundMatches(
    completedMatches: Array<{ winnerId: string; positionInBracket: number }>
  ) {
    const nextMatches: Array<{
      player1Id: string;
      player2Id: string | null;
      winnerId: string | null;
      isBye: boolean;
      positionInBracket: number;
    }> = [];

    for (let i = 0; i < completedMatches.length; i += 2) {
      const positionInBracket = Math.floor(i / 2) + 1;
      const player1Id = completedMatches[i].winnerId;

      if (i + 1 < completedMatches.length) {
        nextMatches.push({
          player1Id,
          player2Id: completedMatches[i + 1].winnerId,
          winnerId: null,
          isBye: false,
          positionInBracket,
        });
      } else {
        nextMatches.push({
          player1Id,
          player2Id: null,
          winnerId: player1Id,
          isBye: true,
          positionInBracket,
        });
      }
    }

    return nextMatches;
  }

  it('pairs even winner count without creating BYE matches', () => {
    const completed = [
      { winnerId: 'w1', positionInBracket: 1 },
      { winnerId: 'w2', positionInBracket: 2 },
      { winnerId: 'w3', positionInBracket: 3 },
      { winnerId: 'w4', positionInBracket: 4 },
    ];

    const nextRound = buildNextRoundMatches(completed);

    expect(nextRound).toHaveLength(2);
    expect(nextRound.every((m) => !m.isBye)).toBe(true);
    expect(nextRound[0]).toEqual({
      player1Id: 'w1',
      player2Id: 'w2',
      winnerId: null,
      isBye: false,
      positionInBracket: 1,
    });
    expect(nextRound[1]).toEqual({
      player1Id: 'w3',
      player2Id: 'w4',
      winnerId: null,
      isBye: false,
      positionInBracket: 2,
    });
  });

  it('creates BYE match for odd winner count', () => {
    const completed = [
      { winnerId: 'w1', positionInBracket: 1 },
      { winnerId: 'w2', positionInBracket: 2 },
      { winnerId: 'w3', positionInBracket: 3 },
    ];

    const nextRound = buildNextRoundMatches(completed);

    expect(nextRound).toHaveLength(2);

    // First match: normal pairing
    expect(nextRound[0]).toEqual({
      player1Id: 'w1',
      player2Id: 'w2',
      winnerId: null,
      isBye: false,
      positionInBracket: 1,
    });

    // Second match: BYE auto-advancement
    expect(nextRound[1]).toEqual({
      player1Id: 'w3',
      player2Id: null,
      winnerId: 'w3',
      isBye: true,
      positionInBracket: 2,
    });
  });

  it('BYE match has winnerId pre-set and player2Id null', () => {
    const completed = [
      { winnerId: 'solo', positionInBracket: 1 },
    ];

    const nextRound = buildNextRoundMatches(completed);

    expect(nextRound).toHaveLength(1);
    expect(nextRound[0].isBye).toBe(true);
    expect(nextRound[0].winnerId).toBe('solo');
    expect(nextRound[0].player2Id).toBeNull();
  });

  it('handles single match (2 winners) correctly', () => {
    const completed = [
      { winnerId: 'a', positionInBracket: 1 },
      { winnerId: 'b', positionInBracket: 2 },
    ];

    const nextRound = buildNextRoundMatches(completed);

    expect(nextRound).toHaveLength(1);
    expect(nextRound[0].isBye).toBe(false);
    expect(nextRound[0].player1Id).toBe('a');
    expect(nextRound[0].player2Id).toBe('b');
  });
});
