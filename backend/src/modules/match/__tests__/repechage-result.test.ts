/**
 * Tests for recordMatchResult repechage round handling.
 *
 * Key bugs fixed:
 * 1. Repechage round completion previously triggered "tournament finished" (wrong).
 * 2. Pending (unpaired) repechage matches (player2Id: null) blocked anyUnfinished forever.
 * 3. Main bracket final round completion found the repechage round as "nextRound" and threw.
 * 4. bracket.service.ts totalRounds included repechage → wrong labels & champion detection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../shared/database/prisma.js';
import { recordMatchResult } from '../match.service.js';

vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../shared/logging/performance.service.js', () => ({
  withPerformanceLog: vi.fn((_j, _l, fn) => fn()),
}));

// ── helpers ─────────────────────────────────────────────────────────────────

const T_ID = 'tournament-1';
const ORG_ID = 'organizer-1';

function baseTournament() {
  return {
    id: T_ID,
    organizerId: ORG_ID,
    status: 'RUNNING',
    thirdPlacePercentage: null,
    fourthPlacePercentage: null,
  };
}

/** Build a repechage match stub */
function repechageMatch(overrides: {
  id?: string;
  positionInBracket?: number;
  player1Id?: string;
  player2Id?: string | null;
  winnerId?: string | null;
  roundNumber?: number;
}) {
  return {
    id: overrides.id ?? 'm-rep-1',
    tournamentId: T_ID,
    roundId: 'rep-round',
    positionInBracket: overrides.positionInBracket ?? 1,
    isBye: false,
    winnerId: overrides.winnerId ?? null,
    player1Id: overrides.player1Id ?? 'p1',
    player2Id: overrides.player2Id ?? 'p2',
    round: {
      roundNumber: overrides.roundNumber ?? 6,
      isRepechage: true,
    },
    tournament: baseTournament(),
  };
}

/** Build a main-bracket match stub */
function mainMatch(overrides: {
  id?: string;
  roundNumber?: number;
  positionInBracket?: number;
  player1Id?: string;
  player2Id?: string | null;
  winnerId?: string | null;
}) {
  return {
    id: overrides.id ?? 'm-main-1',
    tournamentId: T_ID,
    roundId: 'main-round',
    positionInBracket: overrides.positionInBracket ?? 1,
    isBye: false,
    winnerId: overrides.winnerId ?? null,
    player1Id: overrides.player1Id ?? 'p1',
    player2Id: overrides.player2Id ?? 'p2',
    round: {
      roundNumber: overrides.roundNumber ?? 5,
      isRepechage: false,
    },
    tournament: baseTournament(),
  };
}

function mockTx(calls: (() => unknown)[]) {
  let i = 0;
  const tx = {
    match: {
      findUnique: vi.fn(() => calls[i++]?.()),
      findFirst: vi.fn(() => calls[i++]?.()),
      findMany: vi.fn(() => calls[i++]?.()),
      update: vi.fn(() => calls[i++]?.()),
      createMany: vi.fn(() => calls[i++]?.()),
    },
    round: {
      findFirst: vi.fn(() => calls[i++]?.()),
      findUnique: vi.fn(() => calls[i++]?.()),
      count: vi.fn(() => calls[i++]?.()),
    },
    tournament: {
      update: vi.fn(() => ({})),
    },
  };
  vi.mocked(prisma.$transaction).mockImplementation(
    async (fn: (tx: typeof tx) => unknown) => fn(tx)
  );
  return tx;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('recordMatchResult – repechage round', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns roundComplete:false when other paired repechage matches remain', async () => {
    const match = repechageMatch({ id: 'm-rep-1', positionInBracket: 1 });
    const updatedMatch = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    const tx = mockTx([
      () => match,          // match.findUnique
      () => null,           // downstreamMatch.findFirst (repechage: no downstream)
      () => updatedMatch,   // match.update (record winner)
      () => ({ id: 'm-rep-2' }), // anyUnfinished.findFirst → another paired match exists
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-1', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(false);
    expect(result.tournamentFinished).toBe(false);
    expect(result.winnerId).toBe('p1');
    // Confirm anyUnfinished was called with player2Id: { not: null } filter
    expect(tx.match.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ player2Id: { not: null } }),
      })
    );
  });

  it('returns roundComplete:true and tournamentFinished:false when last paired repechage match done', async () => {
    const match = repechageMatch({ id: 'm-rep-last' });
    const updatedMatch = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    mockTx([
      () => match,        // match.findUnique
      () => null,         // downstreamMatch (no downstream for repechage)
      () => updatedMatch, // match.update
      () => null,         // anyUnfinished → none left
      // repechage short-circuit fires here; nothing else called
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-last', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(true);
    expect(result.tournamentFinished).toBe(false);
  });

  it('handles odd rebuyers: pending match (player2:null) is ignored by anyUnfinished', async () => {
    // 3 rebuyers → 1 paired match + 1 pending match (player2: null)
    // When the paired match is resolved, pending match must NOT block round completion
    const match = repechageMatch({ id: 'm-rep-paired', positionInBracket: 1 });
    const updatedMatch = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    mockTx([
      () => match,        // match.findUnique
      () => null,         // downstreamMatch
      () => updatedMatch, // match.update
      () => null,         // anyUnfinished (player2Id: {not:null}) → pending match excluded → null
      // repechage short-circuit
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-paired', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(true);
    expect(result.tournamentFinished).toBe(false);
  });
});

describe('recordMatchResult – main bracket final with repechage round present', () => {
  beforeEach(() => vi.clearAllMocks());

  it('finishes tournament correctly when main bracket final completes (repechage round excluded from nextRound)', async () => {
    // 5-round tournament (32 players). Repechage at round 6.
    // Main bracket final is round 5. When round 5 completes, nextRound lookup
    // must NOT find the repechage round (roundNumber=6) — it should return null → tournament finishes.
    const match = mainMatch({ roundNumber: 5, positionInBracket: 1, id: 'final-match' });
    const updatedMatch = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    const tx = mockTx([
      () => match,          // match.findUnique
      () => null,           // downstreamMatch (isRepechage:false → repechage at round 6 excluded, nothing found)
      () => updatedMatch,   // match.update
      () => null,           // anyUnfinished → none in the final round
      // NOT repechage, continues to round-complete logic
      () => null,           // nextRound.findFirst(isRepechage:false) → null (repechage at round 6 is skipped)
      () => [{ ...match, winnerId: 'p1', positionInBracket: 1 }], // completedMatchesForRound
      () => 5,              // totalRounds (isRepechage:false) → 5
    ]);

    const result = await recordMatchResult(T_ID, 'final-match', { winnerId: 'p1' }, ORG_ID);

    expect(result.tournamentFinished).toBe(true);
    expect(result.roundComplete).toBe(true);
    // tournament.update must have been called with FINISHED status
    expect(tx.tournament.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FINISHED' }),
      })
    );
  });

  it('does not throw when main bracket round N-1 completes and nextRound is repechage-excluded', async () => {
    // Round 4 (semifinal for a 5-round tournament) completes.
    // nextRound should be round 5 (main final, isRepechage:false), not the repechage round.
    const match = mainMatch({ roundNumber: 4, positionInBracket: 1, id: 'semi-match' });
    const updatedMatch = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    // Round 5 main bracket matches (empty — not yet populated)
    const round5 = { id: 'round-5', roundNumber: 5, matches: [] };

    const completedRound4 = [
      { id: 'semi-1', winnerId: 'p1', player1Id: 'p1', player2Id: 'p2', positionInBracket: 1 },
      { id: 'semi-2', winnerId: 'p3', player1Id: 'p3', player2Id: 'p4', positionInBracket: 2 },
    ];

    const tx = mockTx([
      () => match,               // match.findUnique
      () => null,                // downstreamMatch
      () => updatedMatch,        // match.update
      () => null,                // anyUnfinished → round 4 done
      // NOT repechage, continues
      () => round5,              // nextRound.findFirst(isRepechage:false) → round 5 (NOT the repechage)
      () => completedRound4,     // completedMatchesForRound
      () => 5,                   // totalRounds (isRepechage:false) = 5
    ]);

    const result = await recordMatchResult(T_ID, 'semi-match', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(true);
    expect(result.tournamentFinished).toBe(false);
    // Round 5 match should have been created (final match)
    expect(tx.match.createMany).toHaveBeenCalled();
  });
});
