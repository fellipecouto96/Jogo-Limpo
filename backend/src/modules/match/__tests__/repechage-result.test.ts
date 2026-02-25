/**
 * Tests for recordMatchResult repechage round handling.
 *
 * New behaviour (multi-sub-round repechage):
 * 1. While other PAIRED repechage matches are still pending, return early (no placement).
 * 2. When all paired matches are done, compute "unplaced" repechage winners.
 *    - If 2+: create a new sub-round within the same repechage round; return roundComplete:false.
 *    - If 1: insert that champion into Round 2 (open slot or BYE if Round 2 is full).
 * 3. Odd initial rebuyers (player2Id:null at the start) get auto-BYE before sub-round creation.
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
  roundId?: string;
}) {
  return {
    id: overrides.id ?? 'm-rep-1',
    tournamentId: T_ID,
    roundId: overrides.roundId ?? 'rep-round',
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
  isBye?: boolean;
}) {
  return {
    id: overrides.id ?? 'm-main-1',
    tournamentId: T_ID,
    roundId: 'main-round',
    positionInBracket: overrides.positionInBracket ?? 1,
    isBye: overrides.isBye ?? false,
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

  it('returns roundComplete:false (no placement) while another paired match is still pending', async () => {
    // M1 completes but M2 is still unfinished → return early, no Round 2 placement.
    const match = repechageMatch({ id: 'm-rep-1', player1Id: 'p1', player2Id: 'p2' });
    const updated = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    const tx = mockTx([
      () => match,              // match.findUnique
      () => null,               // downstreamMatch
      () => updated,            // match.update (record winner)
      // isRepechage block:
      () => ({ id: 'm-rep-2' }), // match.findFirst (anyUnfinishedRepechage) → another match pending
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-1', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(false);
    expect(result.tournamentFinished).toBe(false);
    expect(result.winnerId).toBe('p1');

    // Should NOT have called round.findFirst (Round 2 lookup) or made any Round 2 changes
    expect(tx.round.findFirst).not.toHaveBeenCalled();
  });

  it('places the repechage champion in an open Round 2 slot when the only match resolves (2 rebuyers)', async () => {
    // 2 rebuyers → 1 match → winner placed in open slot.
    const match = repechageMatch({ id: 'm-rep-1', player1Id: 'p1', player2Id: 'p2' });
    const updated = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    const tx = mockTx([
      () => match,                          // match.findUnique
      () => null,                           // downstreamMatch
      () => updated,                        // match.update (record winner)
      // isRepechage block:
      () => null,                           // match.findFirst (anyUnfinishedRepechage) → none
      () => [],                             // match.findMany (unpairedInitial) → none
      () => [                               // match.findMany (allRepMatches)
        { id: 'm-rep-1', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1', isBye: false },
      ],
      // placeRepechageChampionInRound2:
      () => ({ id: 'round-2' }),            // round.findFirst (Round 2)
      () => ({ id: 'r2-open-slot' }),       // match.findFirst (open slot in Round 2)
      () => updated,                        // match.update (fill open slot)
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-1', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(true);
    expect(result.tournamentFinished).toBe(false);

    // Champion placed by filling the open slot
    expect(tx.match.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ player2Id: 'p1' }) })
    );
  });

  it('creates a BYE match in Round 2 when Round 2 is already fully paired', async () => {
    // Round 2 is full (power-of-2 bracket) → champion gets auto-BYE to Round 3.
    const match = repechageMatch({ id: 'm-rep-1', player1Id: 'p1', player2Id: 'p2' });
    const updated = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    const tx = mockTx([
      () => match,
      () => null,                                       // downstreamMatch
      () => updated,                                    // record winner
      // isRepechage block:
      () => null,                                       // anyUnfinishedRepechage → none
      () => [],                                         // unpairedInitial → none
      () => [                                           // allRepMatches
        { id: 'm-rep-1', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1', isBye: false },
      ],
      // placeRepechageChampionInRound2:
      () => ({ id: 'round-2' }),                        // round.findFirst
      () => null,                                       // match.findFirst (no open slot)
      () => ({ _max: { positionInBracket: 4 } }),       // match.aggregate (max pos)
      () => ({ id: 'bye-match' }),                      // match.create (BYE at pos 5)
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-1', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(true);
    expect(result.tournamentFinished).toBe(false);

    expect(tx.match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          player1Id: 'p1',
          winnerId: 'p1',
          isBye: true,
          roundId: 'round-2',
          positionInBracket: 5,
        }),
      })
    );
  });

  it('creates a sub-round when 4 rebuyers produce 2 unplaced winners after their initial matches', async () => {
    // M1 (p1 vs p2, p1 wins) already done. M2 (p3 vs p4) now completes (p3 wins).
    // Both p1 and p3 are unplaced → create sub-round M3: p1 vs p3.
    const match = repechageMatch({ id: 'm-rep-2', player1Id: 'p3', player2Id: 'p4' });
    const updated = { ...match, winnerId: 'p3', player1Score: null, player2Score: null, finishedAt: new Date() };

    const tx = mockTx([
      () => match,
      () => null,                // downstreamMatch
      () => updated,             // record winner
      // isRepechage block:
      () => null,                // anyUnfinishedRepechage → none
      () => [],                  // unpairedInitial → none
      () => [                    // allRepMatches (both initial matches finished)
        { id: 'm-rep-1', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1', isBye: false },
        { id: 'm-rep-2', player1Id: 'p3', player2Id: 'p4', winnerId: 'p3', isBye: false },
      ],
      // 2 unplaced (p1, p3) → create sub-round:
      () => ({ _max: { positionInBracket: 2 } }),  // match.aggregate (max pos in repechage round)
      () => {},                                     // match.createMany (sub-round M3: p1 vs p3)
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-2', { winnerId: 'p3' }, ORG_ID);

    expect(result.roundComplete).toBe(false);
    expect(result.tournamentFinished).toBe(false);

    expect(tx.match.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ player1Id: 'p1', player2Id: 'p3', positionInBracket: 3 }),
        ]),
      })
    );
  });

  it('places champion into bracket after sub-round resolves to 1 winner (4-rebuyer scenario)', async () => {
    // Sub-round M3 (p1 vs p3) completes. p1 wins. allRepMatches = [M1,M2,M3].
    // Only p1 is unplaced → insert into Round 2.
    const match = repechageMatch({ id: 'm-rep-3', player1Id: 'p1', player2Id: 'p3', positionInBracket: 3 });
    const updated = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    const tx = mockTx([
      () => match,
      () => null,                // downstreamMatch
      () => updated,             // record winner
      // isRepechage block:
      () => null,                // anyUnfinishedRepechage → none
      () => [],                  // unpairedInitial → none
      () => [                    // allRepMatches (all 3 matches)
        { id: 'm-rep-1', player1Id: 'p1', player2Id: 'p2', winnerId: 'p1', isBye: false },
        { id: 'm-rep-2', player1Id: 'p3', player2Id: 'p4', winnerId: 'p3', isBye: false },
        { id: 'm-rep-3', player1Id: 'p1', player2Id: 'p3', winnerId: 'p1', isBye: false },
      ],
      // 1 unplaced (p1) → placeRepechageChampionInRound2:
      () => ({ id: 'round-2' }),           // round.findFirst
      () => ({ id: 'r2-open-slot' }),      // match.findFirst (open slot)
      () => updated,                       // match.update (fill slot with p1)
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-3', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(true);
    expect(result.tournamentFinished).toBe(false);

    expect(tx.match.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ player2Id: 'p1' }) })
    );
  });

  it('auto-BYEs an odd unpaired rebuyer and creates a sub-round with the paired winner', async () => {
    // 3 rebuyers: M1 (pA vs pB), M2 (pOdd, unpaired, player2Id:null, winnerId:null).
    // When M1 completes (pA wins), M2 gets auto-BYE, then sub-round M3 (pA vs pOdd) is created.
    const match = repechageMatch({ id: 'm-rep-1', player1Id: 'pA', player2Id: 'pB' });
    const updated = { ...match, winnerId: 'pA', player1Score: null, player2Score: null, finishedAt: new Date() };

    const tx = mockTx([
      () => match,
      () => null,                                          // downstreamMatch
      () => updated,                                       // record winner
      // isRepechage block:
      () => null,                                          // anyUnfinishedRepechage → none
      () => [{ id: 'm-rep-2', player1Id: 'pOdd' }],       // unpairedInitial → pOdd needs BYE
      () => updated,                                       // match.update (BYE for pOdd)
      () => [                                              // allRepMatches (after BYE applied)
        { id: 'm-rep-1', player1Id: 'pA', player2Id: 'pB', winnerId: 'pA', isBye: false },
        { id: 'm-rep-2', player1Id: 'pOdd', player2Id: null, winnerId: 'pOdd', isBye: true },
      ],
      // 2 unplaced (pA, pOdd) → create sub-round:
      () => ({ _max: { positionInBracket: 2 } }),          // match.aggregate (max pos)
      () => {},                                            // match.createMany (M3: pA vs pOdd)
    ]);

    const result = await recordMatchResult(T_ID, 'm-rep-1', { winnerId: 'pA' }, ORG_ID);

    expect(result.roundComplete).toBe(false);
    expect(result.tournamentFinished).toBe(false);

    // BYE was granted to pOdd
    expect(tx.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm-rep-2' },
        data: expect.objectContaining({ winnerId: 'pOdd', isBye: true }),
      })
    );

    // Sub-round match created: pA vs pOdd
    expect(tx.match.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ player1Id: 'pA', player2Id: 'pOdd' }),
        ]),
      })
    );
  });
});

// ── Main bracket tests ─────────────────────────────────────────────────────

describe('recordMatchResult – main bracket final with repechage round present', () => {
  beforeEach(() => vi.clearAllMocks());

  it('finishes tournament correctly when main bracket final completes (repechage excluded)', async () => {
    const match = mainMatch({ roundNumber: 5, positionInBracket: 1, id: 'final-match' });
    const updated = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    mockTx([
      () => match,          // match.findUnique
      () => null,           // downstreamMatch (round 6 with isRepechage:false → not found)
      () => updated,        // match.update
      // non-repechage block:
      () => null,           // anyUnfinished → round is done
      // Promise.all: [nextRound, completedMatchesForRound, totalRounds]
      () => null,           // round.findFirst(isRepechage:false, roundNumber:6) → null → tournament finishes
      () => [{ ...match, winnerId: 'p1', positionInBracket: 1 }], // completedMatchesForRound
      () => 5,              // totalRounds
    ]);

    const result = await recordMatchResult(T_ID, 'final-match', { winnerId: 'p1' }, ORG_ID);

    expect(result.tournamentFinished).toBe(true);
    expect(result.roundComplete).toBe(true);
  });

  it('advances to next main round and creates next-round matches (repechage excluded from nextRound lookup)', async () => {
    const match = mainMatch({ roundNumber: 4, positionInBracket: 1, id: 'semi-match' });
    const updated = { ...match, winnerId: 'p1', player1Score: null, player2Score: null, finishedAt: new Date() };

    const round5 = { id: 'round-5', roundNumber: 5, matches: [] };
    const completedRound4 = [
      { id: 'semi-1', winnerId: 'p1', player1Id: 'p1', player2Id: 'p2', isBye: false, positionInBracket: 1 },
      { id: 'semi-2', winnerId: 'p3', player1Id: 'p3', player2Id: 'p4', isBye: false, positionInBracket: 2 },
    ];

    const tx = mockTx([
      () => match,               // match.findUnique
      () => null,                // downstreamMatch
      () => updated,             // match.update
      // non-repechage block:
      () => null,                // anyUnfinished → round done
      // Promise.all:
      () => round5,              // nextRound.findFirst(isRepechage:false)
      () => completedRound4,     // completedMatchesForRound
      () => 5,                   // totalRounds
    ]);

    const result = await recordMatchResult(T_ID, 'semi-match', { winnerId: 'p1' }, ORG_ID);

    expect(result.roundComplete).toBe(true);
    expect(result.tournamentFinished).toBe(false);
    expect(tx.match.createMany).toHaveBeenCalled();
  });

  it('creates Final and 3rd/4th correctly when semis include a BYE (repechage champion)', async () => {
    // Scenario: repechage champion got BYE through Round 2, then BYE in Semi (position 3).
    // Real semis: positions 1 and 2. BYE semi: position 3.
    // 3rd/4th should use losers from real semis only.
    const thirdTournament = { ...baseTournament(), thirdPlacePercentage: { toNumber: () => 30 }, fourthPlacePercentage: null };
    const match = {
      id: 'semi-2',
      tournamentId: T_ID,
      roundId: 'semi-round',
      positionInBracket: 2,
      isBye: false,
      winnerId: null,
      player1Id: 'p3',
      player2Id: 'p4',
      round: { roundNumber: 3, isRepechage: false },
      tournament: thirdTournament,
    };
    const updated = { ...match, winnerId: 'p3', player1Score: null, player2Score: null, finishedAt: new Date() };

    const completedSemis = [
      { id: 'semi-1', winnerId: 'p1', player1Id: 'p1', player2Id: 'p2', isBye: false, positionInBracket: 1 },
      { id: 'semi-2', winnerId: 'p3', player1Id: 'p3', player2Id: 'p4', isBye: false, positionInBracket: 2 },
      { id: 'semi-3-bye', winnerId: 'rep-champ', player1Id: 'rep-champ', player2Id: null, isBye: true, positionInBracket: 3 },
    ];

    const tx = mockTx([
      () => match,
      () => null,                // downstreamMatch
      () => updated,             // record winner
      // non-repechage:
      () => null,                // anyUnfinished
      // Promise.all:
      () => ({ id: 'final-round', roundNumber: 4, matches: [] }), // nextRound
      () => completedSemis,      // completedMatchesForRound
      () => 4,                   // totalRounds
    ]);

    const result = await recordMatchResult(T_ID, 'semi-2', { winnerId: 'p3' }, thirdTournament.organizerId);

    expect(result.roundComplete).toBe(true);
    expect(result.tournamentFinished).toBe(false);

    // Final (position 1): winners of real semis p1 vs p3
    // 3rd/4th (position 2): losers of real semis p2 vs p4
    expect(tx.match.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ player1Id: 'p1', player2Id: 'p3', positionInBracket: 1 }),
          expect.objectContaining({ player1Id: 'p2', player2Id: 'p4', positionInBracket: 2 }),
        ]),
      })
    );
  });
});
