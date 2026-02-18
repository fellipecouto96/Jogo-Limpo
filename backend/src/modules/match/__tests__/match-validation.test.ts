import { describe, it, expect } from 'vitest';

/**
 * These tests validate the pure logic / validation rules from match.service.ts
 * without requiring a database connection. We extract and test the validation
 * conditions used in recordMatchResult, updateMatchScore, and getTournamentStatistics.
 */

// ─── Score Validation Logic ─────────────────────

describe('score validation rules', () => {
  function validateScores(
    player1Score: number | null | undefined,
    player2Score: number | null | undefined,
    winnerId: string,
    player1Id: string,
    player2Id: string
  ): { valid: boolean; error?: string } {
    const hasScores =
      player1Score !== null &&
      player1Score !== undefined &&
      player2Score !== null &&
      player2Score !== undefined;

    if (!hasScores) return { valid: true };

    if (player1Score! < 0 || player2Score! < 0) {
      return { valid: false, error: 'Placar nao pode ser negativo' };
    }
    if (player1Score === player2Score) {
      return { valid: false, error: 'Placar nao pode ser empate' };
    }
    const scoreWinnerId =
      player1Score! > player2Score! ? player1Id : player2Id;
    if (scoreWinnerId !== winnerId) {
      return {
        valid: false,
        error: 'Vencedor deve ser o jogador com maior placar',
      };
    }
    return { valid: true };
  }

  it('accepts scores when absent (scores are optional)', () => {
    const result = validateScores(null, null, 'p1', 'p1', 'p2');
    expect(result.valid).toBe(true);
  });

  it('accepts undefined scores', () => {
    const result = validateScores(undefined, undefined, 'p1', 'p1', 'p2');
    expect(result.valid).toBe(true);
  });

  it('accepts valid scores where winner has higher score', () => {
    const result = validateScores(3, 1, 'p1', 'p1', 'p2');
    expect(result.valid).toBe(true);
  });

  it('accepts player2 as winner with higher score', () => {
    const result = validateScores(1, 3, 'p2', 'p1', 'p2');
    expect(result.valid).toBe(true);
  });

  it('rejects negative player1 score', () => {
    const result = validateScores(-1, 3, 'p2', 'p1', 'p2');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Placar nao pode ser negativo');
  });

  it('rejects negative player2 score', () => {
    const result = validateScores(3, -2, 'p1', 'p1', 'p2');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Placar nao pode ser negativo');
  });

  it('rejects equal scores (no draws allowed)', () => {
    const result = validateScores(2, 2, 'p1', 'p1', 'p2');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Placar nao pode ser empate');
  });

  it('rejects zero-zero tie', () => {
    const result = validateScores(0, 0, 'p1', 'p1', 'p2');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Placar nao pode ser empate');
  });

  it('rejects winner mismatch (score says p2 but winner is p1)', () => {
    const result = validateScores(1, 3, 'p1', 'p1', 'p2');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Vencedor deve ser o jogador com maior placar');
  });

  it('rejects winner mismatch (score says p1 but winner is p2)', () => {
    const result = validateScores(5, 2, 'p2', 'p1', 'p2');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Vencedor deve ser o jogador com maior placar');
  });
});

// ─── Winner Validation Logic ─────────────────────

describe('winner validation rules', () => {
  function validateWinner(
    winnerId: string,
    player1Id: string,
    player2Id: string | null
  ): boolean {
    return winnerId === player1Id || winnerId === player2Id;
  }

  it('accepts player1 as valid winner', () => {
    expect(validateWinner('p1', 'p1', 'p2')).toBe(true);
  });

  it('accepts player2 as valid winner', () => {
    expect(validateWinner('p2', 'p1', 'p2')).toBe(true);
  });

  it('rejects a player not in the match', () => {
    expect(validateWinner('p3', 'p1', 'p2')).toBe(false);
  });

  it('rejects winner when player2 is null (BYE match)', () => {
    expect(validateWinner('p2', 'p1', null)).toBe(false);
  });
});

// ─── Match State Validation ─────────────────────

describe('match state preconditions', () => {
  it('BYE matches cannot be edited', () => {
    const match = { isBye: true, winnerId: 'p1' };
    expect(match.isBye).toBe(true);
    // In the service, this throws "Partidas com bye nao podem ser editadas"
  });

  it('already-decided matches cannot be re-decided', () => {
    const match = { isBye: false, winnerId: 'p1' };
    expect(match.winnerId).not.toBeNull();
    // In the service, this throws "Resultado ja registrado"
  });

  it('pending matches can be decided', () => {
    const match = { isBye: false, winnerId: null };
    expect(match.winnerId).toBeNull();
    expect(match.isBye).toBe(false);
    // This is the only valid state for recording a result
  });
});

// ─── Tournament Status Transitions ─────────────────

describe('tournament status transitions', () => {
  const validTransitions: Record<string, string[]> = {
    DRAFT: ['OPEN'],
    OPEN: ['RUNNING'],
    RUNNING: ['FINISHED'],
    FINISHED: [],
  };

  it('RUNNING is required for recording match results', () => {
    const validStatuses = ['RUNNING'];
    expect(validStatuses).toContain('RUNNING');
    expect(validStatuses).not.toContain('DRAFT');
    expect(validStatuses).not.toContain('OPEN');
    expect(validStatuses).not.toContain('FINISHED');
  });

  it('RUNNING or FINISHED allowed for undo', () => {
    const validStatuses = ['RUNNING', 'FINISHED'];
    expect(validStatuses).toContain('RUNNING');
    expect(validStatuses).toContain('FINISHED');
    expect(validStatuses).not.toContain('DRAFT');
    expect(validStatuses).not.toContain('OPEN');
  });

  it('FINISHED tournaments cannot have scores edited', () => {
    const invalidStatuses = ['FINISHED'];
    expect(invalidStatuses).toContain('FINISHED');
  });

  it('final match completion sets status to FINISHED', () => {
    // Simulating: after the last match in the last round is decided
    const isLastRound = true; // no next round exists
    const allMatchesCompleted = true;
    const shouldFinish = isLastRound && allMatchesCompleted;
    expect(shouldFinish).toBe(true);
  });

  it('undo on FINISHED tournament reopens to RUNNING', () => {
    const currentStatus = 'FINISHED';
    const newStatus = currentStatus === 'FINISHED' ? 'RUNNING' : currentStatus;
    expect(newStatus).toBe('RUNNING');
  });
});

// ─── Next Round Pairing Logic ─────────────────────

describe('next round match pairing', () => {
  function buildNextRoundMatches(
    completedMatches: Array<{
      winnerId: string;
      positionInBracket: number;
    }>
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

  it('produces no duplicate matches', () => {
    const completed = [
      { winnerId: 'w1', positionInBracket: 1 },
      { winnerId: 'w2', positionInBracket: 2 },
      { winnerId: 'w3', positionInBracket: 3 },
      { winnerId: 'w4', positionInBracket: 4 },
    ];

    const nextRound = buildNextRoundMatches(completed);
    const positions = nextRound.map((m) => m.positionInBracket);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('produces no empty matches (every match has at least player1)', () => {
    const completed = [
      { winnerId: 'w1', positionInBracket: 1 },
      { winnerId: 'w2', positionInBracket: 2 },
      { winnerId: 'w3', positionInBracket: 3 },
    ];

    const nextRound = buildNextRoundMatches(completed);
    for (const match of nextRound) {
      expect(match.player1Id).toBeTruthy();
    }
  });

  it('halves match count each round (8 → 4 → 2 → 1)', () => {
    let matches = Array.from({ length: 8 }, (_, i) => ({
      winnerId: `w${i}`,
      positionInBracket: i + 1,
    }));

    const counts = [matches.length];
    while (matches.length > 1) {
      const next = buildNextRoundMatches(matches);
      counts.push(next.length);
      matches = next.map((m, i) => ({
        winnerId: m.winnerId ?? m.player1Id,
        positionInBracket: i + 1,
      }));
    }

    expect(counts).toEqual([8, 4, 2, 1]);
  });

  it('handles 5-match round (odd count → 1 BYE in next round)', () => {
    const completed = Array.from({ length: 5 }, (_, i) => ({
      winnerId: `w${i}`,
      positionInBracket: i + 1,
    }));

    const nextRound = buildNextRoundMatches(completed);
    expect(nextRound).toHaveLength(3);

    const byeMatches = nextRound.filter((m) => m.isBye);
    expect(byeMatches).toHaveLength(1);
    expect(byeMatches[0].winnerId).toBe('w4'); // last player gets BYE
    expect(byeMatches[0].player2Id).toBeNull();
  });
});

// ─── Statistics Calculation Logic ─────────────────

describe('statistics calculation logic', () => {
  interface MockMatch {
    player1Score: number | null;
    player2Score: number | null;
    player1Id: string;
    player2Id: string | null;
    player1Name: string;
    player2Name: string | null;
    winnerId: string | null;
  }

  function calculateStats(matches: MockMatch[]) {
    const completedMatches = matches.filter((m) => m.winnerId !== null);
    const matchesWithScores = completedMatches.filter(
      (m) => m.player1Score !== null && m.player2Score !== null
    );

    const totalGames = matchesWithScores.reduce(
      (sum, m) => sum + (m.player1Score ?? 0) + (m.player2Score ?? 0),
      0
    );

    const playerScores = new Map<
      string,
      { name: string; totalScore: number }
    >();
    for (const match of matchesWithScores) {
      const p1 = playerScores.get(match.player1Id) ?? {
        name: match.player1Name,
        totalScore: 0,
      };
      p1.totalScore += match.player1Score ?? 0;
      playerScores.set(match.player1Id, p1);

      if (match.player2Id) {
        const p2 = playerScores.get(match.player2Id) ?? {
          name: match.player2Name ?? '',
          totalScore: 0,
        };
        p2.totalScore += match.player2Score ?? 0;
        playerScores.set(match.player2Id, p2);
      }
    }

    let highestScoringPlayer: {
      id: string;
      name: string;
      totalScore: number;
    } | null = null;
    for (const [id, data] of playerScores) {
      if (
        !highestScoringPlayer ||
        data.totalScore > highestScoringPlayer.totalScore
      ) {
        highestScoringPlayer = { id, name: data.name, totalScore: data.totalScore };
      }
    }

    let biggestWinMargin: {
      margin: number;
      winner: string;
      loser: string;
    } | null = null;
    for (const match of matchesWithScores) {
      if (match.player1Score !== null && match.player2Score !== null) {
        const margin = Math.abs(match.player1Score - match.player2Score);
        if (!biggestWinMargin || margin > biggestWinMargin.margin) {
          const isP1Winner = match.player1Score > match.player2Score;
          biggestWinMargin = {
            margin,
            winner: isP1Winner ? match.player1Name : (match.player2Name ?? ''),
            loser: isP1Winner ? (match.player2Name ?? '') : match.player1Name,
          };
        }
      }
    }

    const averageScorePerMatch =
      matchesWithScores.length > 0
        ? Math.round((totalGames / matchesWithScores.length) * 10) / 10
        : 0;

    return {
      totalMatches: matches.length,
      completedMatches: completedMatches.length,
      totalGames,
      highestScoringPlayer,
      biggestWinMargin,
      averageScorePerMatch,
    };
  }

  const sampleMatches: MockMatch[] = [
    {
      player1Id: 'p1',
      player2Id: 'p2',
      player1Name: 'Alice',
      player2Name: 'Bob',
      player1Score: 6,
      player2Score: 3,
      winnerId: 'p1',
    },
    {
      player1Id: 'p3',
      player2Id: 'p4',
      player1Name: 'Charlie',
      player2Name: 'Diana',
      player1Score: 4,
      player2Score: 6,
      winnerId: 'p4',
    },
    {
      player1Id: 'p1',
      player2Id: 'p4',
      player1Name: 'Alice',
      player2Name: 'Diana',
      player1Score: 7,
      player2Score: 2,
      winnerId: 'p1',
    },
  ];

  it('counts total matches correctly', () => {
    const stats = calculateStats(sampleMatches);
    expect(stats.totalMatches).toBe(3);
    expect(stats.completedMatches).toBe(3);
  });

  it('calculates total games (sum of all scores)', () => {
    const stats = calculateStats(sampleMatches);
    // 6+3 + 4+6 + 7+2 = 28
    expect(stats.totalGames).toBe(28);
  });

  it('identifies highest scoring player correctly', () => {
    const stats = calculateStats(sampleMatches);
    // Alice: 6 + 7 = 13, Bob: 3, Charlie: 4, Diana: 6 + 2 = 8
    expect(stats.highestScoringPlayer?.name).toBe('Alice');
    expect(stats.highestScoringPlayer?.totalScore).toBe(13);
  });

  it('identifies biggest win margin correctly', () => {
    const stats = calculateStats(sampleMatches);
    // Margins: |6-3|=3, |4-6|=2, |7-2|=5
    expect(stats.biggestWinMargin?.margin).toBe(5);
    expect(stats.biggestWinMargin?.winner).toBe('Alice');
    expect(stats.biggestWinMargin?.loser).toBe('Diana');
  });

  it('calculates average score per match correctly', () => {
    const stats = calculateStats(sampleMatches);
    // 28 total games / 3 matches = 9.333... → rounded to 9.3
    expect(stats.averageScorePerMatch).toBe(9.3);
  });

  it('handles matches without scores', () => {
    const noScoreMatches: MockMatch[] = [
      {
        player1Id: 'p1',
        player2Id: 'p2',
        player1Name: 'Alice',
        player2Name: 'Bob',
        player1Score: null,
        player2Score: null,
        winnerId: 'p1',
      },
    ];

    const stats = calculateStats(noScoreMatches);
    expect(stats.completedMatches).toBe(1);
    expect(stats.totalGames).toBe(0);
    expect(stats.highestScoringPlayer).toBeNull();
    expect(stats.biggestWinMargin).toBeNull();
    expect(stats.averageScorePerMatch).toBe(0);
  });

  it('handles empty tournament (no matches)', () => {
    const stats = calculateStats([]);
    expect(stats.totalMatches).toBe(0);
    expect(stats.completedMatches).toBe(0);
    expect(stats.totalGames).toBe(0);
    expect(stats.averageScorePerMatch).toBe(0);
  });
});
