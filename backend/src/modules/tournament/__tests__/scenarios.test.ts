/**
 * Integration-style scenarios testing multi-step business logic.
 * All DB calls are mocked; these tests verify that sequential service
 * calls produce correct cumulative state (financials, bracket, guards).
 *
 * Scenarios:
 *   A — 16 players + 2 late entries → verify financials
 *   B — rebuys → verify is_rebuy, double-rebuy block
 *   C — late entry after allowed round → rejected
 *   D — rebuy after allowed round → rejected
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: {
    tournament: { findUnique: vi.fn(), update: vi.fn() },
    round: { findFirst: vi.fn() },
    player: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    match: { findFirst: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../shared/logging/performance.service.js', () => ({
  withPerformanceLog: vi.fn((_journey, _op, fn, _meta) => fn()),
}));

import { lateEntry, rebuy, TournamentError } from '../tournament.service.js';
import { prisma } from '../../../shared/database/prisma.js';

const mockTournamentFindUnique = vi.mocked(prisma.tournament.findUnique);
const mockTournamentUpdate = vi.mocked(prisma.tournament.update);
const mockRoundFindFirst = vi.mocked(prisma.round.findFirst);
const mockPlayerFindFirst = vi.mocked(prisma.player.findFirst);
const mockPlayerFindUnique = vi.mocked(prisma.player.findUnique);
const mockMatchAggregate = vi.mocked(prisma.match.aggregate);
const mockTransaction = vi.mocked(prisma.$transaction);

function dec(n: number) { return new Decimal(n); }

function baseTournament(overrides: Record<string, unknown> = {}) {
  return {
    organizerId: 'org-1',
    status: 'RUNNING',
    allowLateEntry: true,
    allowLateEntryUntilRound: 1,
    allowRebuy: true,
    allowRebuyUntilRound: 1,
    lateEntryFee: dec(30),
    rebuyFee: dec(30),
    entryFee: dec(30),
    organizerPercentage: dec(20),
    ...overrides,
  };
}

let playerCounter = 0;
function nextPlayer(name = 'Player') {
  playerCounter++;
  return { id: `p-${playerCounter}`, name: `${name} ${playerCounter}`, isRebuy: false };
}

beforeEach(() => {
  vi.clearAllMocks();
  playerCounter = 0;
  mockTournamentUpdate.mockResolvedValue({} as never);
  mockMatchAggregate.mockResolvedValue({ _max: { positionInBracket: 8 } } as never);
  mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
});

// ─── Scenario A ───────────────────────────────────────────────────────────────
// 16 players, enable late entry, add 2 late players → cumulative financial

describe('Scenario A — 16 players + 2 late entries', () => {
  it('accumulates financial correctly across two sequential late entries', async () => {
    // Initial state: 16 players × R$30 = R$480 collected, 20% organizer = R$96
    // Late entry 1: +R$30 → R$510, organizer=R$102, prizePool=R$408
    // Late entry 2: +R$30 → R$540, organizer=R$108, prizePool=R$432
    const initialTotal = 480;

    const stateAfterFirst = { totalCollected: dec(510) };
    const stateAfterSecond = { totalCollected: dec(540) };

    // Entry 1
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ totalCollected: dec(initialTotal) }) as never
    );
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-1', roundNumber: 1 } as never);
    mockPlayerFindFirst.mockResolvedValueOnce(null);
    vi.mocked(prisma.player.create).mockResolvedValueOnce(nextPlayer('Late') as never);
    vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-late-1' } as never);

    await lateEntry('t-1', 'org-1', 'Late Player 1', false);

    expect(mockTournamentUpdate).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        data: expect.objectContaining({
          totalCollected: new Decimal(510),
          calculatedPrizePool: new Decimal(408),
          calculatedOrganizerAmount: new Decimal(102),
        }),
      })
    );

    // Entry 2 — tournament now reflects updated total
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ totalCollected: stateAfterFirst.totalCollected }) as never
    );
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-1', roundNumber: 1 } as never);
    mockPlayerFindFirst.mockResolvedValueOnce(null);
    vi.mocked(prisma.player.create).mockResolvedValueOnce(nextPlayer('Late') as never);
    vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-late-2' } as never);

    await lateEntry('t-1', 'org-1', 'Late Player 2', false);

    expect(mockTournamentUpdate).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        data: expect.objectContaining({
          totalCollected: new Decimal(540),
          calculatedPrizePool: new Decimal(432),
          calculatedOrganizerAmount: new Decimal(108),
        }),
      })
    );

    expect(mockTournamentUpdate).toHaveBeenCalledTimes(2);
    void stateAfterSecond;
  });

  it('rejects a third late entry if round has already advanced past limit', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ totalCollected: dec(540), allowLateEntryUntilRound: 1 }) as never
    );
    // Current round is now 2 — late entry window closed
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-2', roundNumber: 2 } as never);

    await expect(lateEntry('t-1', 'org-1', 'Late Player 3', false)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Entrada tardia encerrada. Permitida apenas ate a rodada 1',
    });
  });

  it('preserves bracket: does not modify existing matches, only creates new bye', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ totalCollected: dec(480) }) as never
    );
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-1', roundNumber: 1 } as never);
    mockPlayerFindFirst.mockResolvedValueOnce(null);
    const newPlayer = nextPlayer('New');
    vi.mocked(prisma.player.create).mockResolvedValueOnce(newPlayer as never);
    vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-new' } as never);

    await lateEntry('t-1', 'org-1', 'New Player', false);

    // Only one match.create called — existing bracket untouched
    expect(prisma.match.create).toHaveBeenCalledTimes(1);
    expect(prisma.match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isBye: true,
          player1Id: newPlayer.id,
          winnerId: newPlayer.id,
        }),
      })
    );
  });
});

// ─── Scenario B ───────────────────────────────────────────────────────────────
// Enable rebuy, 2 players rebuy, third attempt double-rebuy → blocked

describe('Scenario B — rebuy flow with double-rebuy block', () => {
  it('allows first rebuy and sets isRebuy=true', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(baseTournament({ totalCollected: dec(480) }) as never);
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-1', roundNumber: 1 } as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 'elim-1' } as never);
    mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: false } as never);
    vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'p-1', name: 'Player 1', isRebuy: true } as never);
    vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-bye-1' } as never);

    const result = await rebuy('t-1', 'org-1', 'p-1');

    expect(result.player.isRebuy).toBe(true);
    expect(prisma.player.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isRebuy: true } })
    );
  });

  it('allows second different player to rebuy independently', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(baseTournament({ totalCollected: dec(510) }) as never);
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-1', roundNumber: 1 } as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 'elim-2' } as never);
    mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: false } as never);
    vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'p-2', name: 'Player 2', isRebuy: true } as never);
    vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-bye-2' } as never);

    const result = await rebuy('t-1', 'org-1', 'p-2');

    expect(result.player.isRebuy).toBe(true);
  });

  it('blocks double rebuy for same player (p-1 already has isRebuy=true)', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(baseTournament({ totalCollected: dec(540) }) as never);
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-1', roundNumber: 1 } as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 'elim-1-again' } as never);
    // p-1 already has isRebuy=true from first rebuy
    mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: true } as never);

    await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Jogador ja utilizou a repescagem neste torneio',
    });

    // No player.update or match.create should have been called
    expect(prisma.player.update).not.toHaveBeenCalled();
    expect(prisma.match.create).not.toHaveBeenCalled();
  });

  it('updates financials for each rebuy correctly', async () => {
    // After 2 rebuys: R$480 + R$30 + R$30 = R$540
    const initialTotal = 510; // after first rebuy
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ totalCollected: dec(initialTotal), organizerPercentage: dec(20) }) as never
    );
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-1', roundNumber: 1 } as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 'elim-3' } as never);
    mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: false } as never);
    vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'p-3', name: 'Player 3', isRebuy: true } as never);
    vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-bye-3' } as never);

    await rebuy('t-1', 'org-1', 'p-3');

    expect(mockTournamentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalCollected: new Decimal(540),
          calculatedPrizePool: new Decimal(432),
          calculatedOrganizerAmount: new Decimal(108),
        }),
      })
    );
  });
});

// ─── Scenario C ───────────────────────────────────────────────────────────────
// Late entry attempt after allowed round

describe('Scenario C — late entry rejected after allowed round', () => {
  it('rejects late entry when current round > allowLateEntryUntilRound', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ allowLateEntryUntilRound: 1 }) as never
    );
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-2', roundNumber: 2 } as never);

    await expect(lateEntry('t-1', 'org-1', 'Novo Jogador', false)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Entrada tardia encerrada. Permitida apenas ate a rodada 1',
    });

    expect(prisma.player.create).not.toHaveBeenCalled();
    expect(prisma.match.create).not.toHaveBeenCalled();
    expect(mockTournamentUpdate).not.toHaveBeenCalled();
  });

  it('rejects even with force=true when round limit exceeded (round guard is unconditional)', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ allowLateEntryUntilRound: 1 }) as never
    );
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-3', roundNumber: 3 } as never);

    await expect(lateEntry('t-1', 'org-1', 'Novo Jogador', true)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('allows late entry when round == allowLateEntryUntilRound (boundary)', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ allowLateEntryUntilRound: 2, totalCollected: dec(480) }) as never
    );
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-2', roundNumber: 2 } as never);
    mockPlayerFindFirst.mockResolvedValueOnce(null);
    vi.mocked(prisma.player.create).mockResolvedValueOnce(nextPlayer('Late') as never);
    vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-ok' } as never);

    const result = await lateEntry('t-1', 'org-1', 'Late Player', false);

    expect(result).toHaveProperty('player');
    expect(result).toHaveProperty('match');
  });
});

// ─── Scenario D ───────────────────────────────────────────────────────────────
// Rebuy attempt after allowed round

describe('Scenario D — rebuy rejected after allowed round', () => {
  it('rejects rebuy when current round > allowRebuyUntilRound', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ allowRebuyUntilRound: 1 }) as never
    );
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-2', roundNumber: 2 } as never);

    await expect(rebuy('t-1', 'org-1', 'p-99')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Repescagem encerrada. Permitida apenas ate a rodada 1',
    });

    expect(prisma.player.update).not.toHaveBeenCalled();
    expect(prisma.match.create).not.toHaveBeenCalled();
  });

  it('allows rebuy when round == allowRebuyUntilRound (boundary)', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ allowRebuyUntilRound: 2, totalCollected: dec(480) }) as never
    );
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-2', roundNumber: 2 } as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 'elim-ok' } as never);
    mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: false } as never);
    vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'p-ok', name: 'OK Player', isRebuy: true } as never);
    vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-bye-ok' } as never);

    const result = await rebuy('t-1', 'org-1', 'p-ok');

    expect(result.player.isRebuy).toBe(true);
  });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

describe('Edge cases — 5 late entries sequential stress', () => {
  it('correctly accumulates fees for 5 sequential late entries', async () => {
    const entryFee = 20;
    const organizerPct = 25;

    for (let i = 1; i <= 5; i++) {
      const prevTotal = 200 + (i - 1) * entryFee; // starts at 200 (10 players × 20)
      const newTotal = prevTotal + entryFee;
      const expectedOrganizer = Math.round(newTotal * (organizerPct / 100) * 100) / 100;
      const expectedPrize = Math.round((newTotal - expectedOrganizer) * 100) / 100;

      mockTournamentFindUnique.mockResolvedValueOnce(
        baseTournament({
          totalCollected: dec(prevTotal),
          lateEntryFee: dec(entryFee),
          organizerPercentage: dec(organizerPct),
        }) as never
      );
      mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-1', roundNumber: 1 } as never);
      mockPlayerFindFirst.mockResolvedValueOnce(null);
      vi.mocked(prisma.player.create).mockResolvedValueOnce(nextPlayer() as never);
      vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: `m-${i}` } as never);

      await lateEntry('t-1', 'org-1', `Jogador Atrasado ${i}`, false);

      expect(mockTournamentUpdate).toHaveBeenNthCalledWith(
        i,
        expect.objectContaining({
          data: expect.objectContaining({
            totalCollected: new Decimal(newTotal),
            calculatedPrizePool: new Decimal(expectedPrize),
            calculatedOrganizerAmount: new Decimal(expectedOrganizer),
          }),
        })
      );
    }

    expect(mockTournamentUpdate).toHaveBeenCalledTimes(5);
  });
});

describe('Edge cases — tournament disabled features', () => {
  it('rejects late entry when allowLateEntry=false regardless of round', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ allowLateEntry: false }) as never
    );

    await expect(lateEntry('t-1', 'org-1', 'Jogador', false)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Entrada tardia nao permitida neste torneio',
    });
  });

  it('rejects rebuy when allowRebuy=false regardless of player state', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ allowRebuy: false }) as never
    );

    await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Repescagem nao permitida neste torneio',
    });
  });

  it('rejects late entry on FINISHED tournament', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ status: 'FINISHED' }) as never
    );

    await expect(lateEntry('t-1', 'org-1', 'Jogador', false)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Torneio nao esta em andamento',
    });
  });

  it('rejects rebuy on DRAFT tournament', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ status: 'DRAFT' }) as never
    );

    await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Torneio nao esta em andamento',
    });
  });
});

describe('Edge cases — custom vs default price', () => {
  it('late entry uses custom fee when lateEntryFee is set', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ totalCollected: dec(300), lateEntryFee: dec(50), entryFee: dec(30), organizerPercentage: dec(0) }) as never
    );
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-1', roundNumber: 1 } as never);
    mockPlayerFindFirst.mockResolvedValueOnce(null);
    vi.mocked(prisma.player.create).mockResolvedValueOnce(nextPlayer() as never);
    vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-1' } as never);

    await lateEntry('t-1', 'org-1', 'Novo', false);

    expect(mockTournamentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalCollected: new Decimal(350) }),
      })
    );
  });

  it('rebuy falls back to entryFee when rebuyFee is null', async () => {
    mockTournamentFindUnique.mockResolvedValueOnce(
      baseTournament({ totalCollected: dec(300), rebuyFee: null, entryFee: dec(30), organizerPercentage: dec(0) }) as never
    );
    mockRoundFindFirst.mockResolvedValueOnce({ id: 'round-1', roundNumber: 1 } as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({ id: 'elim' } as never);
    mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: false } as never);
    vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'p-1', name: 'P', isRebuy: true } as never);
    vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-bye' } as never);

    await rebuy('t-1', 'org-1', 'p-1');

    expect(mockTournamentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalCollected: new Decimal(330) }),
      })
    );
  });
});
