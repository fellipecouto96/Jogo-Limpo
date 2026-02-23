/**
 * Tests for recordMatchResult repechage round handling.
 *
 * Verified behaviours:
 * 1. Each repechage winner is placed into Round 2 immediately after their match.
 * 2. Placement fills an open Round 2 slot (player2Id:null) or creates a new pending match.
 * 3. When the last paired repechage match is done, unpaired rebuyers (odd count)
 *    get auto-BYEs and are also placed into Round 2.
 * 4. Main bracket rounds are unaffected — repechage rounds are excluded from nextRound
 *    lookups and totalRounds, so the main bracket finishes correctly.
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
    round: { roundNumber: overrides.roundNumber ?? 6, isRepechage: true },
    tournament: baseTournament(),
  };
}

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
    round: { roundNumber: overrides.roundNumber ?? 5, isRepechage: false },
    tournament: baseTournament(),
  };
}

/** Build a sequential call mock for prisma.$transaction */
function mockTx(calls: (() => unknown)[]) {
  let i = 0;
  const next = () => calls[i++]?.();
  const tx = {
    match: {
      findUnique: vi.fn(next),
      findFirst: vi.fn(next),
      findMany: vi.fn(next),
      update: vi.fn(next),
      create: vi.fn(next),
      createMany: vi.fn(next),
      aggregate: vi.fn(next),
    },
    round: {
      findFirst: vi.fn(next),
      findUnique: vi.fn(next),
      count: vi.fn(next),
    },
    tournament: {
      update: vi.fn(() => ({})),
    },
  };
  vi.mocked(prisma.$transaction).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (fn: (tx: any) => unknown) => fn(tx)
  );
  return tx;
}

// ── Repechage tests ───────────────────────────────────────────────────────────

describe('recordMatchResult – repechage round advancement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('places winner into open Round 2 slot and returns roundComplete:false when other paired matches remain', async () => {
    const match = repechageMatch({ id: 'm-rep-1' });
    const updatedMatch = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    const tx = mockTx([
      () => match,                          // match.findUnique
      () => null,                           // downstreamMatch (no downstream for repechage)
      () => updatedMatch,                   // match.update (record winner)
      // — isRepechage block —
      () => ({ id: 'round-2' }),            // round.findFirst (Round 2)
      () => ({ id: 'r2-open-slot' }),       // match.findFirst (open slot in Round 2)
      () => updatedMatch,                   // match.update (fill open slot with winner)
      () => ({ id: 'm-rep-2' }),            // match.findFirst (anyUnfinishedRepechage) → another match
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-1', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(false);
    expect(result.tournamentFinished).toBe(false);
    expect(result.winnerId).toBe('p1');

    // Winner was placed into the open Round 2 slot
    expect(tx.match.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ player2Id: 'p1' }) })
    );
  });

  it('creates new Round 2 pending match when no open slot exists', async () => {
    const match = repechageMatch({ id: 'm-rep-1' });
    const updatedMatch = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    const tx = mockTx([
      () => match,                          // match.findUnique
      () => null,                           // downstreamMatch
      () => updatedMatch,                   // match.update (record winner)
      // — isRepechage block —
      () => ({ id: 'round-2' }),            // round.findFirst (Round 2)
      () => null,                           // match.findFirst (no open slot in Round 2)
      () => ({ _max: { positionInBracket: 3 } }), // match.aggregate (max pos)
      () => ({ id: 'new-r2-match' }),       // match.create (new pending match in Round 2)
      () => ({ id: 'm-rep-2' }),            // match.findFirst (anyUnfinishedRepechage) → another match
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-1', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(false);
    expect(result.tournamentFinished).toBe(false);

    // A new Round 2 match was created with the winner as player1
    expect(tx.match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ player1Id: 'p1', roundId: 'round-2', positionInBracket: 4 }),
      })
    );
  });

  it('returns roundComplete:true when last paired repechage match done and no unpaired remain', async () => {
    const match = repechageMatch({ id: 'm-rep-last' });
    const updatedMatch = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    mockTx([
      () => match,
      () => null,                           // downstreamMatch
      () => updatedMatch,                   // record winner
      // — isRepechage block —
      () => ({ id: 'round-2' }),            // round.findFirst
      () => ({ id: 'r2-slot' }),            // open slot in Round 2
      () => updatedMatch,                   // fill slot
      () => null,                           // anyUnfinishedRepechage → none
      () => [],                             // match.findMany (unpaired) → empty
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-last', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(true);
    expect(result.tournamentFinished).toBe(false);
  });

  it('auto-BYEs unpaired rebuyers and places them into Round 2 when last paired match resolves', async () => {
    // 3 rebuyers: 1 paired match (already done) + 1 pending match (odd rebuyer waiting)
    // When the last paired match resolves, the odd rebuyer should get a BYE
    const match = repechageMatch({ id: 'm-rep-last', player1Id: 'pA', player2Id: 'pB' });
    const updatedMatch = { ...match, winnerId: 'pA', player1Score: null, player2Score: null, finishedAt: new Date() };

    const tx = mockTx([
      () => match,
      () => null,                                         // downstreamMatch
      () => updatedMatch,                                 // record winner
      // — isRepechage block —
      () => ({ id: 'round-2' }),                          // round.findFirst (Round 2)
      () => ({ id: 'r2-slot-1' }),                        // open slot for pA
      () => updatedMatch,                                 // fill slot with pA
      () => null,                                         // anyUnfinishedRepechage → none left
      () => [{ id: 'unpaired', player1Id: 'pOdd' }],     // match.findMany (unpaired rebuyers)
      // — BYE for pOdd —
      () => updatedMatch,                                 // match.update (set isBye, winnerId=pOdd)
      () => ({ id: 'r2-slot-2' }),                        // open slot for pOdd
      () => updatedMatch,                                 // fill slot with pOdd
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-last', { winnerId: 'pA' }, ORG_ID);

    expect(result.roundComplete).toBe(true);
    expect(result.tournamentFinished).toBe(false);

    // BYE was set for the unpaired player
    expect(tx.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'unpaired' },
        data: expect.objectContaining({ winnerId: 'pOdd', isBye: true }),
      })
    );

    // Odd player was placed into Round 2
    expect(tx.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r2-slot-2' },
        data: expect.objectContaining({ player2Id: 'pOdd' }),
      })
    );
  });
});

// ── Main bracket tests ─────────────────────────────────────────────────────

describe('recordMatchResult – main bracket final with repechage round present', () => {
  beforeEach(() => vi.clearAllMocks());

  it('finishes tournament correctly when main bracket final completes (repechage excluded)', async () => {
    const match = mainMatch({ roundNumber: 5, positionInBracket: 1, id: 'final-match' });
    const updatedMatch = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    const tx = mockTx([
      () => match,          // match.findUnique
      () => null,           // downstreamMatch (round 6 with isRepechage:false → not found)
      () => updatedMatch,   // match.update
      // — non-repechage block —
      () => null,           // anyUnfinished (round is done)
      () => null,           // nextRound.findFirst(isRepechage:false) → null → tournament finishes
      () => [{ ...match, winnerId: 'p1', positionInBracket: 1 }], // completedMatchesForRound
      () => 5,              // totalRounds (isRepechage:false) → 5
    ]);

    const result = await recordMatchResult(T_ID, 'final-match', { winnerId: 'p1' }, ORG_ID);

    expect(result.tournamentFinished).toBe(true);
    expect(result.roundComplete).toBe(true);
    expect(tx.tournament.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FINISHED' }),
      })
    );
  });

  it('advances to next main round (repechage excluded from nextRound lookup)', async () => {
    const match = mainMatch({ roundNumber: 4, positionInBracket: 1, id: 'semi-match' });
    const updatedMatch = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    const round5 = { id: 'round-5', roundNumber: 5, matches: [] };
    const completedRound4 = [
      { id: 'semi-1', winnerId: 'p1', player1Id: 'p1', player2Id: 'p2', positionInBracket: 1 },
      { id: 'semi-2', winnerId: 'p3', player1Id: 'p3', player2Id: 'p4', positionInBracket: 2 },
    ];

    const tx = mockTx([
      () => match,               // match.findUnique
      () => null,                // downstreamMatch
      () => updatedMatch,        // match.update
      // — non-repechage block —
      () => null,                // anyUnfinished → round done
      () => round5,              // nextRound.findFirst(isRepechage:false) → round 5
      () => completedRound4,     // completedMatchesForRound
      () => 5,                   // totalRounds
    ]);

    const result = await recordMatchResult(T_ID, 'semi-match', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(true);
    expect(result.tournamentFinished).toBe(false);
    expect(tx.match.createMany).toHaveBeenCalled();
  });
});
