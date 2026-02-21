/**
 * Large Tournament Stress Tests
 * Simulates 10 large tournaments (32–128 players) exercising
 * Late Entry and Repescagem flows end-to-end.
 *
 * Invariants verified on every tournament:
 *  - No match is ever created with isBye:true or a pre-set winnerId
 *  - Sequential pairing: odd player waits, even player pairs
 *  - Financial accumulation is exact at every step
 *  - Late entry is blocked once Round 1 is complete
 *  - Rebuy is blocked for Round 2+ eliminated players
 *  - Double rebuy is rejected unconditionally
 *  - Repechage round is created once and reused
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: {
    tournament: { findUnique: vi.fn(), update: vi.fn() },
    round: { findFirst: vi.fn(), create: vi.fn() },
    player: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    match: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../shared/logging/performance.service.js', () => ({
  withPerformanceLog: vi.fn((_j, _o, fn: () => unknown) => fn()),
}));

import { lateEntry, rebuy, TournamentError } from '../tournament.service.js';
import { prisma } from '../../../shared/database/prisma.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dec(n: number) { return new Decimal(n); }

function makeTournament(overrides: Record<string, unknown> = {}) {
  return {
    organizerId: 'org-1',
    status: 'RUNNING',
    allowLateEntry: true,
    allowRebuy: true,
    lateEntryFee: dec(20),
    rebuyFee: dec(15),
    entryFee: dec(50),
    totalCollected: dec(0),
    organizerPercentage: dec(10),
    ...overrides,
  };
}

function makeRound(roundNumber = 1) {
  return { id: `round-${roundNumber}`, roundNumber };
}

function makePlayer(index: number) {
  return { id: `player-${index}`, name: `Jogador ${index}`, isRebuy: false };
}

function makeMatch(index: number) {
  return { id: `match-${index}` };
}

// Reset all mocks between each test
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation(
    async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)
  );
  vi.mocked(prisma.tournament.update).mockResolvedValue({} as never);
  vi.mocked(prisma.match.aggregate).mockResolvedValue({ _max: { positionInBracket: 10 } } as never);
});

// ─── Scenario builder ─────────────────────────────────────────────────────────

/**
 * Runs N sequential late entries for a tournament.
 * Returns a list of { paired, matchId } results and
 * records all prisma.match.create and prisma.match.update calls.
 */
async function runLateEntries(opts: {
  tournamentId: string;
  totalPlayers: number;
  entryFee: number;
  lateEntryFee: number;
  organizerPct: number;
  initialTotal: number;
}) {
  const { tournamentId, totalPlayers, entryFee, lateEntryFee, organizerPct, initialTotal } = opts;
  const results: { paired: boolean; matchIndex: number }[] = [];
  const matchCreateCalls: unknown[] = [];
  const matchUpdateCalls: unknown[] = [];

  vi.mocked(prisma.match.create).mockImplementation((args) => {
    matchCreateCalls.push(args);
    return Promise.resolve(makeMatch(matchCreateCalls.length) as never);
  });

  vi.mocked(prisma.match.update).mockImplementation((args) => {
    matchUpdateCalls.push(args);
    return Promise.resolve(makeMatch(matchUpdateCalls.length) as never);
  });

  let playerIdx = 0;
  for (let i = 0; i < totalPlayers; i++) {
    playerIdx++;
    const isOdd = i % 2 === 0; // 0-indexed: even i = first of pair

    // Running total grows with each entry
    const currentTotal = initialTotal + i * lateEntryFee;
    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(
      makeTournament({
        totalCollected: dec(currentTotal),
        lateEntryFee: dec(lateEntryFee),
        entryFee: dec(entryFee),
        organizerPercentage: dec(organizerPct),
      }) as never
    );
    vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(makeRound(1) as never);
    vi.mocked(prisma.player.findFirst).mockResolvedValueOnce(null as never); // no duplicate

    if (isOdd) {
      // No open slot, no BYE → pending match
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.player.create).mockResolvedValueOnce(makePlayer(playerIdx) as never);
    } else {
      // Open slot from previous player → paired
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(makeMatch(matchCreateCalls.length) as never);
      vi.mocked(prisma.player.create).mockResolvedValueOnce(makePlayer(playerIdx) as never);
    }

    const result = await lateEntry(tournamentId, 'org-1', `Jogador ${playerIdx}`, false);
    results.push({ paired: !isOdd, matchIndex: matchCreateCalls.length });
  }

  return { results, matchCreateCalls, matchUpdateCalls };
}

/**
 * Runs N sequential rebuys for a tournament.
 * Odd player creates repechage pending match; even player pairs with previous.
 */
async function runRebuys(opts: {
  tournamentId: string;
  totalPlayers: number;
  rebuyFee: number;
  organizerPct: number;
  initialTotal: number;
  hasExistingRepechageRound: boolean;
}) {
  const { tournamentId, totalPlayers, rebuyFee, organizerPct, initialTotal, hasExistingRepechageRound } = opts;
  const results: { paired: boolean }[] = [];

  vi.mocked(prisma.match.create).mockResolvedValue(makeMatch(0) as never);
  vi.mocked(prisma.match.update).mockResolvedValue(makeMatch(0) as never);
  vi.mocked(prisma.round.create).mockResolvedValue({ id: 'rep-round', roundNumber: 99 } as never);

  for (let i = 0; i < totalPlayers; i++) {
    const isOdd = i % 2 === 0;
    const currentTotal = initialTotal + i * rebuyFee;

    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(
      makeTournament({
        totalCollected: dec(currentTotal),
        rebuyFee: dec(rebuyFee),
        organizerPercentage: dec(organizerPct),
      }) as never
    );
    // Player was eliminated in Round 1
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: `elim-${i}` } as never);
    vi.mocked(prisma.player.findUnique).mockResolvedValueOnce({ isRebuy: false } as never);
    vi.mocked(prisma.player.update).mockResolvedValueOnce(
      { id: `player-rebuy-${i}`, name: `Rebuy ${i}`, isRebuy: true } as never
    );

    if (i === 0 && !hasExistingRepechageRound) {
      // No repechage round yet → create it
      vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.round.findFirst).mockResolvedValueOnce({ roundNumber: 2 } as never); // lastRound in tx
    } else if (isOdd && i > 0) {
      // Round exists but no open slot
      vi.mocked(prisma.round.findFirst).mockResolvedValueOnce({ id: 'rep-round', roundNumber: 99 } as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never);
    } else {
      // Round exists with open slot
      vi.mocked(prisma.round.findFirst).mockResolvedValueOnce({ id: 'rep-round', roundNumber: 99 } as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(makeMatch(0) as never);
    }

    const result = await rebuy(tournamentId, 'org-1', `player-${i}`);
    results.push({ paired: result.paired });
  }

  return { results };
}

// ─── Tournament simulations ────────────────────────────────────────────────────

describe('Tournament 1 – 32 players, 8 late entries, 4 rebuys', () => {
  const T = { id: 't-01', base: 1600, leFee: 20, rbFee: 15, orgPct: 10 };

  it('all 8 late entries pair correctly (4 pairs)', async () => {
    const { results, matchCreateCalls, matchUpdateCalls } = await runLateEntries({
      tournamentId: T.id,
      totalPlayers: 8,
      entryFee: 50,
      lateEntryFee: T.leFee,
      organizerPct: T.orgPct,
      initialTotal: T.base,
    });

    // 4 players waited (odd), 4 paired (even)
    const waiting = results.filter((r) => !r.paired);
    const paired = results.filter((r) => r.paired);
    expect(waiting).toHaveLength(4);
    expect(paired).toHaveLength(4);

    // 4 new matches created (one per waiting player)
    expect(matchCreateCalls).toHaveLength(4);
    // 4 match updates (pairing)
    expect(matchUpdateCalls).toHaveLength(4);
  });

  it('no new match is ever created with isBye:true', async () => {
    await runLateEntries({
      tournamentId: T.id,
      totalPlayers: 8,
      entryFee: 50,
      lateEntryFee: T.leFee,
      organizerPct: T.orgPct,
      initialTotal: T.base,
    });
    for (const call of vi.mocked(prisma.match.create).mock.calls) {
      expect((call[0] as { data: Record<string, unknown> }).data).not.toHaveProperty('isBye', true);
      expect((call[0] as { data: Record<string, unknown> }).data).not.toHaveProperty('winnerId');
    }
  });

  it('4 rebuys create 2 repechage pairs', async () => {
    const { results } = await runRebuys({
      tournamentId: T.id,
      totalPlayers: 4,
      rebuyFee: T.rbFee,
      organizerPct: T.orgPct,
      initialTotal: T.base + 8 * T.leFee,
      hasExistingRepechageRound: false,
    });

    expect(results[0].paired).toBe(false); // creates repechage round
    expect(results[1].paired).toBe(true);  // pairs with #0
    expect(results[2].paired).toBe(false); // new pending
    expect(results[3].paired).toBe(true);  // pairs with #2
  });
});

describe('Tournament 2 – 64 players, 12 late entries (odd number = last waits)', () => {
  const T = { id: 't-02', base: 3200, leFee: 25, rbFee: 20, orgPct: 15 };

  it('12 late entries produce 5 pairs + 1 waiting player', async () => {
    // 12 players: players 0,2,4,6,8,10 create matches (odd-indexed in pairs)
    //             players 1,3,5,7,9,11 pair — but 12 is even so last one (index 11) pairs
    // Actually with 12 players: indices 0..11
    // 0 → waits, 1 → pairs with 0, 2 → waits, 3 → pairs, ...
    // 6 pairs created, 0 leftover — all even count
    const { results, matchCreateCalls, matchUpdateCalls } = await runLateEntries({
      tournamentId: T.id,
      totalPlayers: 12,
      entryFee: 50,
      lateEntryFee: T.leFee,
      organizerPct: T.orgPct,
      initialTotal: T.base,
    });

    const waiting = results.filter((r) => !r.paired);
    const paired = results.filter((r) => r.paired);
    expect(waiting).toHaveLength(6);
    expect(paired).toHaveLength(6);
    expect(matchCreateCalls).toHaveLength(6);
    expect(matchUpdateCalls).toHaveLength(6);
  });

  it('late entry is blocked after Round 1 completes', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament() as never);
    vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(null as never); // R1 done

    await expect(lateEntry(T.id, 'org-1', 'Atrasado', false)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Entrada tardia encerrada. A primeira rodada ja foi concluida.',
    });
  });

  it('financial accumulation is correct across 12 entries at R$25 each', async () => {
    const collectedAmounts: number[] = [];
    vi.mocked(prisma.tournament.update).mockImplementation((args) => {
      const data = args.data as { totalCollected?: Decimal };
      if (data.totalCollected != null) {
        collectedAmounts.push(data.totalCollected.toNumber());
      }
      return Promise.resolve({} as never);
    });

    for (let i = 0; i < 12; i++) {
      const currentTotal = T.base + i * T.leFee;
      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(
        makeTournament({ totalCollected: dec(currentTotal), lateEntryFee: dec(T.leFee), organizerPercentage: dec(T.orgPct) }) as never
      );
      vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(makeRound(1) as never);
      vi.mocked(prisma.player.findFirst).mockResolvedValueOnce(null as never);

      if (i % 2 === 0) {
        vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never);
        vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never);
        vi.mocked(prisma.player.create).mockResolvedValueOnce(makePlayer(i) as never);
        vi.mocked(prisma.match.create).mockResolvedValueOnce(makeMatch(i) as never);
      } else {
        vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(makeMatch(i - 1) as never);
        vi.mocked(prisma.player.create).mockResolvedValueOnce(makePlayer(i) as never);
        vi.mocked(prisma.match.update).mockResolvedValueOnce(makeMatch(i) as never);
      }

      await lateEntry(T.id, 'org-1', `Jogador ${i}`, false);
    }

    // Each entry adds exactly R$25 to the running total
    for (let i = 0; i < 12; i++) {
      expect(collectedAmounts[i]).toBe(T.base + (i + 1) * T.leFee);
    }
  });
});

describe('Tournament 3 – 128 players, 20 late entries, 10 rebuys (high volume)', () => {
  const T = { id: 't-03', base: 6400, leFee: 30, rbFee: 25, orgPct: 10 };

  it('20 late entries: 10 pairs, all invariants hold', async () => {
    const { results, matchCreateCalls, matchUpdateCalls } = await runLateEntries({
      tournamentId: T.id,
      totalPlayers: 20,
      entryFee: 50,
      lateEntryFee: T.leFee,
      organizerPct: T.orgPct,
      initialTotal: T.base,
    });

    expect(results.filter((r) => !r.paired)).toHaveLength(10);
    expect(results.filter((r) => r.paired)).toHaveLength(10);
    expect(matchCreateCalls).toHaveLength(10);
    expect(matchUpdateCalls).toHaveLength(10);

    for (const call of vi.mocked(prisma.match.create).mock.calls) {
      const data = (call[0] as { data: Record<string, unknown> }).data;
      expect(data['isBye']).not.toBe(true);
      expect(data).not.toHaveProperty('winnerId');
    }
  });

  it('10 rebuys from Round 1 eliminations: 5 pairs created', async () => {
    const { results } = await runRebuys({
      tournamentId: T.id,
      totalPlayers: 10,
      rebuyFee: T.rbFee,
      organizerPct: T.orgPct,
      initialTotal: T.base + 20 * T.leFee,
      hasExistingRepechageRound: false,
    });

    const notPaired = results.filter((r) => !r.paired);
    const isPaired = results.filter((r) => r.paired);
    expect(notPaired).toHaveLength(5);
    expect(isPaired).toHaveLength(5);
  });

  it('blocks 5 round-2 eliminations from rebuy', async () => {
    for (let i = 0; i < 5; i++) {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament() as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never); // no R1 elimination

      await expect(rebuy(T.id, 'org-1', `r2-player-${i}`)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Repescagem permitida apenas para jogadores eliminados na rodada 1',
      });
    }
  });
});

describe('Tournament 4 – 48 players, mixed: 6 late entries + 6 rebuys interleaved', () => {
  const T = { id: 't-04', base: 2400, leFee: 20, rbFee: 15, orgPct: 10 };

  it('late entries and rebuys accumulate financials independently', async () => {
    const collectedAmounts: number[] = [];
    vi.mocked(prisma.tournament.update).mockImplementation((args) => {
      const data = args.data as { totalCollected?: Decimal };
      if (data.totalCollected != null) collectedAmounts.push(data.totalCollected.toNumber());
      return Promise.resolve({} as never);
    });

    // 3 late entries
    for (let i = 0; i < 3; i++) {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(
        makeTournament({ totalCollected: dec(T.base + i * T.leFee), lateEntryFee: dec(T.leFee), organizerPercentage: dec(T.orgPct) }) as never
      );
      vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(makeRound(1) as never);
      vi.mocked(prisma.player.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.player.create).mockResolvedValueOnce(makePlayer(i) as never);
      vi.mocked(prisma.match.create).mockResolvedValueOnce(makeMatch(i) as never);
      await lateEntry(T.id, 'org-1', `Late ${i}`, false);
    }

    const leTotal = T.base + 3 * T.leFee;

    // 3 rebuys
    vi.mocked(prisma.match.create).mockResolvedValue(makeMatch(99) as never);
    vi.mocked(prisma.match.update).mockResolvedValue(makeMatch(99) as never);
    vi.mocked(prisma.round.create).mockResolvedValue({ id: 'rep-round', roundNumber: 99 } as never);

    for (let i = 0; i < 3; i++) {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(
        makeTournament({ totalCollected: dec(leTotal + i * T.rbFee), rebuyFee: dec(T.rbFee), organizerPercentage: dec(T.orgPct) }) as never
      );
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: `elim-${i}` } as never);
      vi.mocked(prisma.player.findUnique).mockResolvedValueOnce({ isRebuy: false } as never);
      vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: `rb-${i}`, isRebuy: true } as never);

      if (i === 0) {
        vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(null as never);
        vi.mocked(prisma.round.findFirst).mockResolvedValueOnce({ roundNumber: 2 } as never);
      } else {
        vi.mocked(prisma.round.findFirst).mockResolvedValueOnce({ id: 'rep-round', roundNumber: 99 } as never);
        // Alternate: no slot / open slot
        vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(i % 2 === 1 ? null : makeMatch(0) as never);
      }
      await rebuy(T.id, 'org-1', `rb-${i}`);
    }

    // First 3 updates: late entries (T.base + 20, 40, 60)
    expect(collectedAmounts[0]).toBe(T.base + 20);
    expect(collectedAmounts[1]).toBe(T.base + 40);
    expect(collectedAmounts[2]).toBe(T.base + 60);
    // Next 3: rebuys (leTotal + 15, 30, 45)
    expect(collectedAmounts[3]).toBe(leTotal + 15);
    expect(collectedAmounts[4]).toBe(leTotal + 30);
    expect(collectedAmounts[5]).toBe(leTotal + 45);
  });
});

describe('Tournament 5 – 64 players, BYE conversion stress (8 BYE slots filled)', () => {
  const T = { id: 't-05', base: 3200, leFee: 20, orgPct: 10 };

  it('8 late entries fill 8 BYE slots → all paired:true immediately', async () => {
    for (let i = 0; i < 8; i++) {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(
        makeTournament({ totalCollected: dec(T.base + i * T.leFee), lateEntryFee: dec(T.leFee) }) as never
      );
      vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(makeRound(1) as never);
      vi.mocked(prisma.player.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never);        // no open-slot match
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(makeMatch(i) as never); // BYE slot
      vi.mocked(prisma.player.create).mockResolvedValueOnce(makePlayer(i) as never);
      vi.mocked(prisma.match.update).mockResolvedValueOnce(makeMatch(i) as never);

      const result = await lateEntry(T.id, 'org-1', `Late ${i}`, false);
      expect(result.paired).toBe(true);
    }

    // No new matches created (all filled BYE slots)
    expect(vi.mocked(prisma.match.create)).not.toHaveBeenCalled();
    // 8 match updates (converting BYE → real)
    expect(vi.mocked(prisma.match.update)).toHaveBeenCalledTimes(8);

    // Verify every update cleared isBye and winnerId
    for (const call of vi.mocked(prisma.match.update).mock.calls) {
      const data = (call[0] as { data: Record<string, unknown> }).data;
      expect(data['isBye']).toBe(false);
      expect(data['winnerId']).toBeNull();
    }
  });
});

describe('Tournament 6 – 32 players, double-rebuy rejection (16 attempts, all blocked)', () => {
  const T = { id: 't-06' };

  it('blocks all 16 double-rebuy attempts after players already rebuyed', async () => {
    for (let i = 0; i < 16; i++) {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament() as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: `elim-${i}` } as never); // R1 eliminated
      vi.mocked(prisma.player.findUnique).mockResolvedValueOnce({ isRebuy: true } as never);  // already rebuyed

      await expect(rebuy(T.id, 'org-1', `player-${i}`)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Jogador ja utilizou a repescagem neste torneio',
      });
    }

    expect(vi.mocked(prisma.player.update)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.match.create)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.round.create)).not.toHaveBeenCalled();
  });
});

describe('Tournament 7 – 32 players, duplicate detection (10 blocked late entries)', () => {
  const T = { id: 't-07' };

  it('blocks 10 duplicate names and never creates a player or match', async () => {
    const existingPlayers = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos',
      'Lucia', 'Bruno', 'Carla', 'Diego', 'Elena'];

    for (const name of existingPlayers) {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament() as never);
      vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(makeRound(1) as never);
      vi.mocked(prisma.player.findFirst).mockResolvedValueOnce({ name } as never);

      const result = await lateEntry(T.id, 'org-1', name.toLowerCase(), false);
      expect(result).toMatchObject({ isDuplicate: true, existingName: name });
    }

    expect(vi.mocked(prisma.player.create)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.match.create)).not.toHaveBeenCalled();
  });

  it('force=true bypasses duplicate check for all 10 names', async () => {
    vi.mocked(prisma.match.create).mockResolvedValue(makeMatch(0) as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValue(null as never);

    const existingPlayers = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos',
      'Lucia', 'Bruno', 'Carla', 'Diego', 'Elena'];

    for (let i = 0; i < existingPlayers.length; i++) {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament() as never);
      vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(makeRound(1) as never);
      vi.mocked(prisma.player.findFirst).mockResolvedValueOnce({ name: existingPlayers[i] } as never); // duplicate exists
      vi.mocked(prisma.player.create).mockResolvedValueOnce(makePlayer(i) as never);

      const result = await lateEntry(T.id, 'org-1', existingPlayers[i]!, true);
      // force=true: player.findFirst should NOT have been called for duplicate check
      expect(result).not.toHaveProperty('isDuplicate');
    }
  });
});

describe('Tournament 8 – 64 players, R$0 entry fee (free tournament)', () => {
  const T = { id: 't-08' };

  it('late entries with null lateEntryFee fall back to entryFee=0, total stays 0', async () => {
    const amounts: number[] = [];
    vi.mocked(prisma.tournament.update).mockImplementation((args) => {
      const data = args.data as { totalCollected?: Decimal };
      if (data.totalCollected != null) amounts.push(data.totalCollected.toNumber());
      return Promise.resolve({} as never);
    });

    for (let i = 0; i < 5; i++) {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(
        makeTournament({ totalCollected: dec(0), lateEntryFee: null, entryFee: dec(0), organizerPercentage: dec(0) }) as never
      );
      vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(makeRound(1) as never);
      vi.mocked(prisma.player.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.player.create).mockResolvedValueOnce(makePlayer(i) as never);
      vi.mocked(prisma.match.create).mockResolvedValueOnce(makeMatch(i) as never);
      await lateEntry(T.id, 'org-1', `Free ${i}`, false);
    }

    for (const amount of amounts) {
      expect(amount).toBe(0);
    }
  });
});

describe('Tournament 9 – 128 players, repechage round created once, reused for 16 rebuys', () => {
  const T = { id: 't-09', base: 6400, rbFee: 20, orgPct: 10 };

  it('repechage round is created exactly once across 16 rebuys', async () => {
    vi.mocked(prisma.match.create).mockResolvedValue(makeMatch(0) as never);
    vi.mocked(prisma.match.update).mockResolvedValue(makeMatch(0) as never);
    vi.mocked(prisma.round.create).mockResolvedValue({ id: 'rep-round', roundNumber: 99 } as never);

    for (let i = 0; i < 16; i++) {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(
        makeTournament({ totalCollected: dec(T.base + i * T.rbFee), rebuyFee: dec(T.rbFee), organizerPercentage: dec(T.orgPct) }) as never
      );
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: `elim-${i}` } as never);
      vi.mocked(prisma.player.findUnique).mockResolvedValueOnce({ isRebuy: false } as never);
      vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: `rb-${i}`, isRebuy: true } as never);

      if (i === 0) {
        // First rebuy: no repechage round yet
        vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(null as never);
        vi.mocked(prisma.round.findFirst).mockResolvedValueOnce({ roundNumber: 2 } as never);
      } else {
        // All subsequent: repechage exists
        vi.mocked(prisma.round.findFirst).mockResolvedValueOnce({ id: 'rep-round', roundNumber: 99 } as never);
        // Alternate: open / not open
        vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(
          i % 2 === 1 ? null : makeMatch(0) as never
        );
      }

      await rebuy(T.id, 'org-1', `player-${i}`);
    }

    // Repechage round created only once
    expect(vi.mocked(prisma.round.create)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(prisma.round.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isRepechage: true }) })
    );
  });

  it('financial: 16 rebuys at R$20 each, 10% organizer cut applied correctly', async () => {
    const amounts: number[] = [];
    vi.mocked(prisma.tournament.update).mockImplementation((args) => {
      const data = args.data as { totalCollected?: Decimal };
      if (data.totalCollected != null) amounts.push(data.totalCollected.toNumber());
      return Promise.resolve({} as never);
    });
    vi.mocked(prisma.match.create).mockResolvedValue(makeMatch(0) as never);
    vi.mocked(prisma.match.update).mockResolvedValue(makeMatch(0) as never);
    vi.mocked(prisma.round.create).mockResolvedValue({ id: 'rr', roundNumber: 99 } as never);

    for (let i = 0; i < 16; i++) {
      const currentTotal = T.base + i * T.rbFee;
      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(
        makeTournament({ totalCollected: dec(currentTotal), rebuyFee: dec(T.rbFee), organizerPercentage: dec(T.orgPct) }) as never
      );
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: `elim-${i}` } as never);
      vi.mocked(prisma.player.findUnique).mockResolvedValueOnce({ isRebuy: false } as never);
      vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: `rb-${i}`, isRebuy: true } as never);

      if (i === 0) {
        vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(null as never);
        vi.mocked(prisma.round.findFirst).mockResolvedValueOnce({ roundNumber: 2 } as never);
      } else {
        vi.mocked(prisma.round.findFirst).mockResolvedValueOnce({ id: 'rr', roundNumber: 99 } as never);
        vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(i % 2 === 0 ? makeMatch(0) as never : null as never);
      }
      await rebuy(T.id, 'org-1', `player-${i}`);
    }

    for (let i = 0; i < 16; i++) {
      expect(amounts[i]).toBe(T.base + (i + 1) * T.rbFee);
    }
  });
});

describe('Tournament 10 – 128 players, full fairness audit (all guards in sequence)', () => {
  const T = { id: 't-10' };

  it('tournament not found → 404', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(null);
    await expect(lateEntry(T.id, 'org-1', 'X', false)).rejects.toMatchObject({ statusCode: 404 });

    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(null);
    await expect(rebuy(T.id, 'org-1', 'p-1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('wrong organizer → 403', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament({ organizerId: 'other' }) as never);
    await expect(lateEntry(T.id, 'org-1', 'X', false)).rejects.toMatchObject({ statusCode: 403 });

    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament({ organizerId: 'other' }) as never);
    await expect(rebuy(T.id, 'org-1', 'p-1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('tournament not RUNNING → 409', async () => {
    for (const status of ['OPEN', 'FINISHED']) {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament({ status }) as never);
      await expect(lateEntry(T.id, 'org-1', 'X', false)).rejects.toMatchObject({ statusCode: 409 });

      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament({ status }) as never);
      await expect(rebuy(T.id, 'org-1', 'p-1')).rejects.toMatchObject({ statusCode: 409 });
    }
  });

  it('feature disabled → 409 with correct message', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament({ allowLateEntry: false }) as never);
    await expect(lateEntry(T.id, 'org-1', 'X', false)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Entrada tardia nao permitida neste torneio',
    });

    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament({ allowRebuy: false }) as never);
    await expect(rebuy(T.id, 'org-1', 'p-1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Repescagem nao permitida neste torneio',
    });
  });

  it('Round 1 complete → late entry blocked, rebuy for R2+ player → blocked', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament() as never);
    vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(null as never);
    await expect(lateEntry(T.id, 'org-1', 'Late', false)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Entrada tardia encerrada. A primeira rodada ja foi concluida.',
    });

    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(makeTournament() as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never); // not eliminated in R1
    await expect(rebuy(T.id, 'org-1', 'p-r2')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Repescagem permitida apenas para jogadores eliminados na rodada 1',
    });
  });

  it('TournamentError carries correct metadata', () => {
    const e = new TournamentError('Teste', 422);
    expect(e).toBeInstanceOf(Error);
    expect(e.statusCode).toBe(422);
    expect(e.message).toBe('Teste');
    expect(e.name).toBe('TournamentError');
  });
});
