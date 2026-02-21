/**
 * Stress & Integration Scenario Tests
 * Late Entry and Rebuy – Competitive Fairness Rules
 *
 * Tests edge cases, bulk operations, and sequential pairing logic.
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
  withPerformanceLog: vi.fn((_journey, _op, fn: () => unknown) => fn()),
}));

import { lateEntry, rebuy, TournamentError } from '../tournament.service.js';
import { prisma } from '../../../shared/database/prisma.js';
import { withPerformanceLog } from '../../../shared/logging/performance.service.js';

// Use resetAllMocks to clear ALL state (stats + implementations) between tests
beforeEach(() => {
  vi.resetAllMocks();
  // Restore shared implementations cleared by resetAllMocks
  vi.mocked(prisma.$transaction).mockImplementation(
    async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)
  );
  vi.mocked(prisma.tournament.update).mockResolvedValue({} as never);
  vi.mocked(prisma.match.aggregate).mockResolvedValue({ _max: { positionInBracket: 4 } } as never);
  vi.mocked(withPerformanceLog).mockImplementation((_j: unknown, _o: unknown, fn: () => unknown) => fn());
});

function dec(n: number) { return new Decimal(n); }

function baseTournament(overrides: Record<string, unknown> = {}) {
  return {
    organizerId: 'org-1',
    status: 'RUNNING',
    allowLateEntry: true,
    allowRebuy: true,
    lateEntryFee: dec(20),
    rebuyFee: dec(15),
    entryFee: dec(50),
    totalCollected: dec(500),
    organizerPercentage: dec(10),
    ...overrides,
  };
}

// ─── Late Entry Stress Tests ──────────────────────────────────────────────────

describe('lateEntry – stress scenarios', () => {
  it('sequential pairing: 1st player waits, 2nd player pairs with 1st', async () => {
    const mockTFU = vi.mocked(prisma.tournament.findUnique);
    const mockRFF = vi.mocked(prisma.round.findFirst);
    const mockPFF = vi.mocked(prisma.player.findFirst);
    const mockMFF = vi.mocked(prisma.match.findFirst);
    const mockPC = vi.mocked(prisma.player.create);
    const mockMC = vi.mocked(prisma.match.create);
    const mockMU = vi.mocked(prisma.match.update);

    // ── Player 1: no open slot → creates pending match ──
    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockRFF.mockResolvedValueOnce({ id: 'r1', roundNumber: 1 } as never);
    mockPFF.mockResolvedValueOnce(null as never);              // no duplicate
    mockMFF.mockResolvedValueOnce(null as never);              // no open slot
    mockMFF.mockResolvedValueOnce(null as never);              // no bye slot
    mockPC.mockResolvedValueOnce({ id: 'p1', name: 'Alice' } as never);
    mockMC.mockResolvedValueOnce({ id: 'm-pending' } as never);

    const r1 = await lateEntry('t-1', 'org-1', 'Alice', false);
    expect(r1).toMatchObject({ paired: false, match: { id: 'm-pending' } });

    // ── Player 2: open slot exists → paired ──
    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockRFF.mockResolvedValueOnce({ id: 'r1', roundNumber: 1 } as never);
    mockPFF.mockResolvedValueOnce(null as never);              // no duplicate
    mockMFF.mockResolvedValueOnce({ id: 'm-pending' } as never); // open slot found
    mockPC.mockResolvedValueOnce({ id: 'p2', name: 'Bob' } as never);
    mockMU.mockResolvedValueOnce({ id: 'm-pending' } as never);

    const r2 = await lateEntry('t-1', 'org-1', 'Bob', false);
    expect(r2).toMatchObject({ paired: true, match: { id: 'm-pending' } });
    expect(mockMU).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm-pending' },
        data: expect.objectContaining({ player2Id: 'p2', isBye: false, winnerId: null }),
      })
    );
  });

  it('4 consecutive late entries: P1+P2 paired, P3+P4 paired', async () => {
    const mockTFU = vi.mocked(prisma.tournament.findUnique);
    const mockRFF = vi.mocked(prisma.round.findFirst);
    const mockPFF = vi.mocked(prisma.player.findFirst);
    const mockMFF = vi.mocked(prisma.match.findFirst);
    const mockPC = vi.mocked(prisma.player.create);
    const mockMC = vi.mocked(prisma.match.create);
    const mockMU = vi.mocked(prisma.match.update);

    const round1 = { id: 'r1', roundNumber: 1 };

    // P1: no open slot → creates m-1 (pending)
    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockRFF.mockResolvedValueOnce(round1 as never);
    mockPFF.mockResolvedValueOnce(null as never);
    mockMFF.mockResolvedValueOnce(null as never); // no open slot
    mockMFF.mockResolvedValueOnce(null as never); // no bye slot
    mockPC.mockResolvedValueOnce({ id: 'id-1', name: 'P1' } as never);
    mockMC.mockResolvedValueOnce({ id: 'm-1' } as never);

    const res1 = await lateEntry('t-1', 'org-1', 'P1', false);
    expect(res1).toMatchObject({ paired: false });

    // P2: open slot m-1 → paired with P1
    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockRFF.mockResolvedValueOnce(round1 as never);
    mockPFF.mockResolvedValueOnce(null as never);
    mockMFF.mockResolvedValueOnce({ id: 'm-1' } as never); // open slot
    mockPC.mockResolvedValueOnce({ id: 'id-2', name: 'P2' } as never);
    mockMU.mockResolvedValueOnce({ id: 'm-1' } as never);

    const res2 = await lateEntry('t-1', 'org-1', 'P2', false);
    expect(res2).toMatchObject({ paired: true, match: { id: 'm-1' } });

    // P3: no open slot (m-1 is now filled) → creates m-2 (pending)
    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockRFF.mockResolvedValueOnce(round1 as never);
    mockPFF.mockResolvedValueOnce(null as never);
    mockMFF.mockResolvedValueOnce(null as never); // no open slot
    mockMFF.mockResolvedValueOnce(null as never); // no bye slot
    mockPC.mockResolvedValueOnce({ id: 'id-3', name: 'P3' } as never);
    mockMC.mockResolvedValueOnce({ id: 'm-2' } as never);

    const res3 = await lateEntry('t-1', 'org-1', 'P3', false);
    expect(res3).toMatchObject({ paired: false });

    // P4: open slot m-2 → paired with P3
    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockRFF.mockResolvedValueOnce(round1 as never);
    mockPFF.mockResolvedValueOnce(null as never);
    mockMFF.mockResolvedValueOnce({ id: 'm-2' } as never); // open slot
    mockPC.mockResolvedValueOnce({ id: 'id-4', name: 'P4' } as never);
    mockMU.mockResolvedValueOnce({ id: 'm-2' } as never);

    const res4 = await lateEntry('t-1', 'org-1', 'P4', false);
    expect(res4).toMatchObject({ paired: true, match: { id: 'm-2' } });

    // Verify: exactly 2 new matches created (for P1 and P3 as pending)
    expect(mockMC).toHaveBeenCalledTimes(2);
    // Verify: 2 match updates (P2 paired with P1, P4 paired with P3)
    expect(mockMU).toHaveBeenCalledTimes(2);
  });

  it('refuses all late entries once Round 1 is complete', async () => {
    const mockTFU = vi.mocked(prisma.tournament.findUnique);
    const mockRFF = vi.mocked(prisma.round.findFirst);
    const mockPC = vi.mocked(prisma.player.create);
    const mockMC = vi.mocked(prisma.match.create);

    for (const name of ['X1', 'X2', 'X3']) {
      mockTFU.mockResolvedValueOnce(baseTournament() as never);
      mockRFF.mockResolvedValueOnce(null as never); // Round 1 done
      await expect(lateEntry('t-1', 'org-1', name, false)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Entrada tardia encerrada. A primeira rodada ja foi concluida.',
      });
    }
    expect(mockPC).not.toHaveBeenCalled();
    expect(mockMC).not.toHaveBeenCalled();
  });

  it('BYE slot conversion: existing BYE player gets a real opponent', async () => {
    const mockTFU = vi.mocked(prisma.tournament.findUnique);
    const mockRFF = vi.mocked(prisma.round.findFirst);
    const mockPFF = vi.mocked(prisma.player.findFirst);
    const mockMFF = vi.mocked(prisma.match.findFirst);
    const mockPC = vi.mocked(prisma.player.create);
    const mockMU = vi.mocked(prisma.match.update);

    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockRFF.mockResolvedValueOnce({ id: 'r1', roundNumber: 1 } as never);
    mockPFF.mockResolvedValueOnce(null as never);
    mockMFF.mockResolvedValueOnce(null as never);                           // no open-slot match
    mockMFF.mockResolvedValueOnce({ id: 'bye-match-original' } as never);  // BYE slot
    mockPC.mockResolvedValueOnce({ id: 'p-late', name: 'Lara' } as never);
    mockMU.mockResolvedValueOnce({ id: 'bye-match-original' } as never);

    const result = await lateEntry('t-1', 'org-1', 'Lara', false);

    expect(result).toMatchObject({ paired: true, match: { id: 'bye-match-original' } });
    expect(mockMU).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isBye: false,
          winnerId: null,
          finishedAt: null,
          player2Id: 'p-late',
        }),
      })
    );
  });

  it('financials: each late entry adds correct fee regardless of pairing status', async () => {
    const mockTFU = vi.mocked(prisma.tournament.findUnique);
    const mockRFF = vi.mocked(prisma.round.findFirst);
    const mockPFF = vi.mocked(prisma.player.findFirst);
    const mockMFF = vi.mocked(prisma.match.findFirst);
    const mockPC = vi.mocked(prisma.player.create);
    const mockMC = vi.mocked(prisma.match.create);
    const mockMU = vi.mocked(prisma.match.update);
    const mockTU = vi.mocked(prisma.tournament.update);

    const feeCalls: number[] = [];
    mockTU.mockImplementation((args: { data: { totalCollected: Decimal } }) => {
      feeCalls.push(args.data.totalCollected.toNumber());
      return {} as never;
    });

    // Player A: total 500 + fee 20 = 520
    mockTFU.mockResolvedValueOnce(baseTournament({ totalCollected: dec(500), lateEntryFee: dec(20), organizerPercentage: dec(0) }) as never);
    mockRFF.mockResolvedValueOnce({ id: 'r1', roundNumber: 1 } as never);
    mockPFF.mockResolvedValueOnce(null as never);
    mockMFF.mockResolvedValueOnce(null as never); // no open slot
    mockMFF.mockResolvedValueOnce(null as never); // no bye slot
    mockPC.mockResolvedValueOnce({ id: 'pa', name: 'A' } as never);
    mockMC.mockResolvedValueOnce({ id: 'ma' } as never);
    await lateEntry('t-1', 'org-1', 'A', false);

    // Player B: total 520 + fee 20 = 540 (from fresh tournament fetch)
    mockTFU.mockResolvedValueOnce(baseTournament({ totalCollected: dec(520), lateEntryFee: dec(20), organizerPercentage: dec(0) }) as never);
    mockRFF.mockResolvedValueOnce({ id: 'r1', roundNumber: 1 } as never);
    mockPFF.mockResolvedValueOnce(null as never);
    mockMFF.mockResolvedValueOnce({ id: 'ma' } as never); // paired with A
    mockPC.mockResolvedValueOnce({ id: 'pb', name: 'B' } as never);
    mockMU.mockResolvedValueOnce({ id: 'ma' } as never);
    await lateEntry('t-1', 'org-1', 'B', false);

    expect(feeCalls[0]).toBe(520);
    expect(feeCalls[1]).toBe(540);
  });
});

// ─── Rebuy Stress Tests ───────────────────────────────────────────────────────

describe('rebuy – stress scenarios', () => {
  it('first rebuy creates repechage round with pending match (paired: false)', async () => {
    const mockTFU = vi.mocked(prisma.tournament.findUnique);
    const mockRFF = vi.mocked(prisma.round.findFirst);
    const mockRC = vi.mocked(prisma.round.create);
    const mockMFF = vi.mocked(prisma.match.findFirst);
    const mockPFU = vi.mocked(prisma.player.findUnique);
    const mockPU = vi.mocked(prisma.player.update);
    const mockMC = vi.mocked(prisma.match.create);

    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockMFF.mockResolvedValueOnce({ id: 'elim-r1' } as never);  // eliminated in R1
    mockPFU.mockResolvedValueOnce({ isRebuy: false } as never);
    mockRFF.mockResolvedValueOnce(null as never);                // no existing repechage round
    // inside transaction: lastRound + repechage round creation
    mockRFF.mockResolvedValueOnce({ roundNumber: 2 } as never);
    mockRC.mockResolvedValueOnce({ id: 'rep-round', roundNumber: 3 } as never);
    // no open slot since repechageRound was null (skips findFirst)
    mockPU.mockResolvedValueOnce({ id: 'p1', name: 'Ana', isRebuy: true } as never);
    mockMC.mockResolvedValueOnce({ id: 'm-rep-1' } as never);

    const result = await rebuy('t-1', 'org-1', 'p1');

    expect(result.paired).toBe(false);
    expect(mockRC).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isRepechage: true }),
      })
    );
    // No auto-advance
    const matchData = mockMC.mock.calls[0]?.[0]?.data;
    expect(matchData).not.toHaveProperty('isBye', true);
    expect(matchData).not.toHaveProperty('winnerId');
  });

  it('second rebuy pairs with first — repechage match becomes real (paired: true)', async () => {
    const mockTFU = vi.mocked(prisma.tournament.findUnique);
    const mockRFF = vi.mocked(prisma.round.findFirst);
    const mockMFF = vi.mocked(prisma.match.findFirst);
    const mockPFU = vi.mocked(prisma.player.findUnique);
    const mockPU = vi.mocked(prisma.player.update);
    const mockMU = vi.mocked(prisma.match.update);
    const mockMC = vi.mocked(prisma.match.create);

    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockMFF.mockResolvedValueOnce({ id: 'elim-r1-p2' } as never); // P2 eliminated in R1
    mockPFU.mockResolvedValueOnce({ isRebuy: false } as never);
    mockRFF.mockResolvedValueOnce({ id: 'rep-round', roundNumber: 3 } as never); // repechage exists
    mockMFF.mockResolvedValueOnce({ id: 'waiting-m' } as never);                // open slot
    mockPU.mockResolvedValueOnce({ id: 'p2', name: 'Bruno', isRebuy: true } as never);
    mockMU.mockResolvedValueOnce({ id: 'waiting-m' } as never);

    const result = await rebuy('t-1', 'org-1', 'p2');

    expect(result.paired).toBe(true);
    expect(mockMU).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'waiting-m' }, data: { player2Id: 'p2' } })
    );
    expect(mockMC).not.toHaveBeenCalled();
  });

  it('3rd rebuy: no open slot after P1+P2 paired → new pending match (paired: false)', async () => {
    const mockTFU = vi.mocked(prisma.tournament.findUnique);
    const mockRFF = vi.mocked(prisma.round.findFirst);
    const mockMFF = vi.mocked(prisma.match.findFirst);
    const mockPFU = vi.mocked(prisma.player.findUnique);
    const mockPU = vi.mocked(prisma.player.update);
    const mockMC = vi.mocked(prisma.match.create);
    const mockMU = vi.mocked(prisma.match.update);

    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockMFF.mockResolvedValueOnce({ id: 'elim-r1-p3' } as never); // eliminated in R1
    mockPFU.mockResolvedValueOnce({ isRebuy: false } as never);
    mockRFF.mockResolvedValueOnce({ id: 'rep-round', roundNumber: 3 } as never);
    mockMFF.mockResolvedValueOnce(null as never);                   // no open slot
    mockPU.mockResolvedValueOnce({ id: 'p3', name: 'Carla', isRebuy: true } as never);
    mockMC.mockResolvedValueOnce({ id: 'm-rep-2' } as never);

    const result = await rebuy('t-1', 'org-1', 'p3');

    expect(result.paired).toBe(false);
    expect(mockMC).toHaveBeenCalled();
    expect(mockMU).not.toHaveBeenCalled();
  });

  it('4th rebuy pairs with 3rd (P3+P4)', async () => {
    const mockTFU = vi.mocked(prisma.tournament.findUnique);
    const mockRFF = vi.mocked(prisma.round.findFirst);
    const mockMFF = vi.mocked(prisma.match.findFirst);
    const mockPFU = vi.mocked(prisma.player.findUnique);
    const mockPU = vi.mocked(prisma.player.update);
    const mockMU = vi.mocked(prisma.match.update);

    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockMFF.mockResolvedValueOnce({ id: 'elim-r1-p4' } as never);  // eliminated in R1
    mockPFU.mockResolvedValueOnce({ isRebuy: false } as never);
    mockRFF.mockResolvedValueOnce({ id: 'rep-round', roundNumber: 3 } as never);
    mockMFF.mockResolvedValueOnce({ id: 'm-rep-2' } as never);      // open slot (P3 waiting)
    mockPU.mockResolvedValueOnce({ id: 'p4', name: 'Diego', isRebuy: true } as never);
    mockMU.mockResolvedValueOnce({ id: 'm-rep-2' } as never);

    const result = await rebuy('t-1', 'org-1', 'p4');

    expect(result.paired).toBe(true);
    expect(mockMU).toHaveBeenCalledWith(
      expect.objectContaining({ data: { player2Id: 'p4' } })
    );
  });

  it('blocks rebuy for player eliminated in Round 2 (not Round 1)', async () => {
    const mockTFU = vi.mocked(prisma.tournament.findUnique);
    const mockMFF = vi.mocked(prisma.match.findFirst);

    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockMFF.mockResolvedValueOnce(null as never); // no Round 1 elimination found
    await expect(rebuy('t-1', 'org-1', 'p-r2-eliminated')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Repescagem permitida apenas para jogadores eliminados na rodada 1',
    });
  });

  it('blocks double rebuy regardless of scenario', async () => {
    const mockTFU = vi.mocked(prisma.tournament.findUnique);
    const mockMFF = vi.mocked(prisma.match.findFirst);
    const mockPFU = vi.mocked(prisma.player.findUnique);
    const mockPU = vi.mocked(prisma.player.update);

    mockTFU.mockResolvedValueOnce(baseTournament() as never);
    mockMFF.mockResolvedValueOnce({ id: 'elim-match' } as never);
    mockPFU.mockResolvedValueOnce({ isRebuy: true } as never); // already rebuyed

    await expect(rebuy('t-1', 'org-1', 'p-already-rebuy')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Jogador ja utilizou a repescagem neste torneio',
    });
    expect(mockPU).not.toHaveBeenCalled();
  });

  it('correctly accumulates fees for multiple rebuys', async () => {
    const mockTFU = vi.mocked(prisma.tournament.findUnique);
    const mockRFF = vi.mocked(prisma.round.findFirst);
    const mockRC = vi.mocked(prisma.round.create);
    const mockMFF = vi.mocked(prisma.match.findFirst);
    const mockPFU = vi.mocked(prisma.player.findUnique);
    const mockPU = vi.mocked(prisma.player.update);
    const mockMC = vi.mocked(prisma.match.create);
    const mockTU = vi.mocked(prisma.tournament.update);

    const feeCalls: number[] = [];
    mockTU.mockImplementation((args: { data: { totalCollected: Decimal } }) => {
      feeCalls.push(args.data.totalCollected.toNumber());
      return {} as never;
    });

    // Player RA: 500 + 15 = 515
    mockTFU.mockResolvedValueOnce(baseTournament({ totalCollected: dec(500), rebuyFee: dec(15), organizerPercentage: dec(0) }) as never);
    mockMFF.mockResolvedValueOnce({ id: 'em-a' } as never);
    mockPFU.mockResolvedValueOnce({ isRebuy: false } as never);
    mockRFF.mockResolvedValueOnce(null as never);                    // no repechage round
    mockRFF.mockResolvedValueOnce({ roundNumber: 2 } as never);     // last round in tx
    mockRC.mockResolvedValueOnce({ id: 'rr', roundNumber: 3 } as never);
    mockPU.mockResolvedValueOnce({ id: 'ra', name: 'A', isRebuy: true } as never);
    mockMC.mockResolvedValueOnce({ id: 'm-a' } as never);
    await rebuy('t-1', 'org-1', 'ra');

    // Player RB: 515 + 15 = 530 (pairs with RA)
    mockTFU.mockResolvedValueOnce(baseTournament({ totalCollected: dec(515), rebuyFee: dec(15), organizerPercentage: dec(0) }) as never);
    mockMFF.mockResolvedValueOnce({ id: 'em-b' } as never);
    mockPFU.mockResolvedValueOnce({ isRebuy: false } as never);
    mockRFF.mockResolvedValueOnce({ id: 'rr', roundNumber: 3 } as never); // repechage exists
    mockMFF.mockResolvedValueOnce({ id: 'm-a' } as never);                // open slot
    mockPU.mockResolvedValueOnce({ id: 'rb', name: 'B', isRebuy: true } as never);
    vi.mocked(prisma.match.update).mockResolvedValueOnce({ id: 'm-a' } as never);
    await rebuy('t-1', 'org-1', 'rb');

    expect(feeCalls[0]).toBe(515);
    expect(feeCalls[1]).toBe(530);
  });
});

// ─── Integration: Fairness Rules ─────────────────────────────────────────────

describe('fairness rule enforcement', () => {
  it('lateEntry: refuses entry after Round 1 completes', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(baseTournament() as never);
    vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(null as never); // Round 1 done
    await expect(lateEntry('t-1', 'org-1', 'Late', false)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Entrada tardia encerrada. A primeira rodada ja foi concluida.',
    });
  });

  it('rebuy: Round 2 eliminated player cannot rebuy even if tournament allows it', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(baseTournament({ allowRebuy: true }) as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never); // no Round 1 elimination
    await expect(rebuy('t-1', 'org-1', 'p-r2')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Repescagem permitida apenas para jogadores eliminados na rodada 1',
    });
  });

  it('lateEntry: duplicate player check blocks entry', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(baseTournament() as never);
    vi.mocked(prisma.round.findFirst).mockResolvedValueOnce({ id: 'r1', roundNumber: 1 } as never);
    vi.mocked(prisma.player.findFirst).mockResolvedValueOnce({ name: 'Alice' } as never); // duplicate
    const result = await lateEntry('t-1', 'org-1', 'alice', false);
    expect(result).toMatchObject({ isDuplicate: true });
    expect(vi.mocked(prisma.player.create)).not.toHaveBeenCalled();
  });

  it('rebuy: double rebuy blocked regardless of round state', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(baseTournament() as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 'em' } as never);
    vi.mocked(prisma.player.findUnique).mockResolvedValueOnce({ isRebuy: true } as never);
    await expect(rebuy('t-1', 'org-1', 'p-double')).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(vi.mocked(prisma.round.create)).not.toHaveBeenCalled();
  });

  it('lateEntry + rebuy both respect financial accuracy (no double counting)', async () => {
    const feeCalls: number[] = [];
    vi.mocked(prisma.tournament.update).mockImplementation((args: { data: { totalCollected: Decimal } }) => {
      feeCalls.push(args.data.totalCollected.toNumber());
      return {} as never;
    });

    // Late entry: 300 + 20 = 320
    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(
      baseTournament({ totalCollected: dec(300), lateEntryFee: dec(20), organizerPercentage: dec(0) }) as never
    );
    vi.mocked(prisma.round.findFirst).mockResolvedValueOnce({ id: 'r1', roundNumber: 1 } as never);
    vi.mocked(prisma.player.findFirst).mockResolvedValueOnce(null as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never); // no open slot
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce(null as never); // no bye slot
    vi.mocked(prisma.player.create).mockResolvedValueOnce({ id: 'pl', name: 'Late' } as never);
    vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'ml' } as never);
    await lateEntry('t-1', 'org-1', 'Late', false);
    expect(feeCalls[0]).toBe(320);

    // Rebuy: 320 + 15 = 335 (from fresh tournament fetch)
    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(
      baseTournament({ totalCollected: dec(320), rebuyFee: dec(15), organizerPercentage: dec(0) }) as never
    );
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 'em' } as never);
    vi.mocked(prisma.player.findUnique).mockResolvedValueOnce({ isRebuy: false } as never);
    vi.mocked(prisma.round.findFirst).mockResolvedValueOnce(null as never); // no repechage
    vi.mocked(prisma.round.findFirst).mockResolvedValueOnce({ roundNumber: 1 } as never); // last round
    vi.mocked(prisma.round.create).mockResolvedValueOnce({ id: 'rr', roundNumber: 2 } as never);
    vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'pr', name: 'R', isRebuy: true } as never);
    vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'mr' } as never);
    await rebuy('t-1', 'org-1', 'pr');
    expect(feeCalls[1]).toBe(335);
  });
});

// ─── TournamentError Class ────────────────────────────────────────────────────

describe('TournamentError', () => {
  it('carries correct statusCode and message', () => {
    const e = new TournamentError('msg', 409);
    expect(e.statusCode).toBe(409);
    expect(e.message).toBe('msg');
    expect(e).toBeInstanceOf(Error);
  });
});
