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
  withPerformanceLog: vi.fn((_journey, _op, fn, _meta) => fn()),
}));

import { lateEntry, rebuy, TournamentError } from '../tournament.service.js';
import { prisma } from '../../../shared/database/prisma.js';

const mockTournamentFindUnique = vi.mocked(prisma.tournament.findUnique);
const mockTournamentUpdate = vi.mocked(prisma.tournament.update);
const mockRoundFindFirst = vi.mocked(prisma.round.findFirst);
const mockRoundCreate = vi.mocked(prisma.round.create);
const mockPlayerFindFirst = vi.mocked(prisma.player.findFirst);
const mockPlayerFindUnique = vi.mocked(prisma.player.findUnique);
const mockMatchFindFirst = vi.mocked(prisma.match.findFirst);
const mockMatchUpdate = vi.mocked(prisma.match.update);
const mockMatchAggregate = vi.mocked(prisma.match.aggregate);
const mockTransaction = vi.mocked(prisma.$transaction);

function dec(value: number) {
  return new Decimal(value);
}

function makeTournament(overrides: Record<string, unknown> = {}) {
  return {
    organizerId: 'org-1',
    status: 'RUNNING',
    allowLateEntry: true,
    allowRebuy: true,
    lateEntryFee: dec(20),
    rebuyFee: dec(15),
    entryFee: dec(50),
    totalCollected: dec(100),
    organizerPercentage: dec(20),
    ...overrides,
  };
}

function makeRound(roundNumber = 1) {
  return { id: `round-${roundNumber}`, roundNumber };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTournamentUpdate.mockResolvedValue({} as never);
  mockMatchAggregate.mockResolvedValue({ _max: { positionInBracket: 2 } } as never);
  mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
    return fn(prisma);
  });
});

// ─── lateEntry ────────────────────────────────────────────────────────────────

describe('lateEntry', () => {
  describe('guards', () => {
    it('throws 404 when tournament not found', async () => {
      mockTournamentFindUnique.mockResolvedValue(null);
      await expect(lateEntry('t-1', 'org-1', 'Ana', false)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Torneio nao encontrado',
      });
    });

    it('throws 403 when organizer does not own tournament', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament({ organizerId: 'org-2' }) as never);
      await expect(lateEntry('t-1', 'org-1', 'Ana', false)).rejects.toMatchObject({
        statusCode: 403,
        message: 'Acesso negado',
      });
    });

    it('throws 409 when tournament is not RUNNING', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament({ status: 'OPEN' }) as never);
      await expect(lateEntry('t-1', 'org-1', 'Ana', false)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Torneio nao esta em andamento',
      });
    });

    it('throws 409 when late entry is not allowed', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament({ allowLateEntry: false }) as never);
      await expect(lateEntry('t-1', 'org-1', 'Ana', false)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Entrada tardia nao permitida neste torneio',
      });
    });

    it('throws 409 when Round 1 has no unplayed matches (all completed)', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(null); // no Round 1 with unplayed matches
      await expect(lateEntry('t-1', 'org-1', 'Ana', false)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Entrada tardia encerrada. A primeira rodada ja foi concluida.',
      });
    });

    it('throws 409 even if later rounds have unplayed matches (Round 1 completed)', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(null); // service queries roundNumber:1 specifically
      await expect(lateEntry('t-1', 'org-1', 'Ana', false)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Entrada tardia encerrada. A primeira rodada ja foi concluida.',
      });
    });
  });

  describe('duplicate detection', () => {
    it('returns isDuplicate when player name exists (case-insensitive)', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue({ name: 'Ana Silva' } as never);

      const result = await lateEntry('t-1', 'org-1', 'ana silva', false);

      expect(result).toEqual({ isDuplicate: true, existingName: 'Ana Silva' });
    });

    it('returns isDuplicate when name has leading/trailing spaces (trimmed before check)', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue({ name: 'João' } as never);

      const result = await lateEntry('t-1', 'org-1', '  João  ', false);

      expect(result).toEqual({ isDuplicate: true, existingName: 'João' });
    });

    it('bypasses duplicate check when force=true', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue({ name: 'Ana Silva' } as never);
      mockMatchFindFirst.mockResolvedValueOnce(null as never); // no open slot
      mockMatchFindFirst.mockResolvedValueOnce(null as never); // no bye slot
      const createdPlayer = { id: 'p-new', name: 'Ana Silva' };
      const createdMatch = { id: 'm-new' };
      vi.mocked(prisma.player.create).mockResolvedValue(createdPlayer as never);
      vi.mocked(prisma.match.create).mockResolvedValue(createdMatch as never);

      const result = await lateEntry('t-1', 'org-1', 'Ana Silva', true);

      expect(mockPlayerFindFirst).not.toHaveBeenCalled();
      expect(result).toMatchObject({ player: createdPlayer, match: createdMatch });
    });
  });

  describe('pairing: fills open slot (BYE conversion)', () => {
    it('pairs new player with open slot (player2Id null, no winner) — paired: true', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue(null as never);
      // open slot found
      mockMatchFindFirst.mockResolvedValueOnce({ id: 'open-match' } as never);
      const createdPlayer = { id: 'p-new', name: 'Bruno' };
      vi.mocked(prisma.player.create).mockResolvedValue(createdPlayer as never);
      mockMatchUpdate.mockResolvedValue({ id: 'open-match' } as never);

      const result = await lateEntry('t-1', 'org-1', 'Bruno', false);

      expect(result).toMatchObject({ player: createdPlayer, match: { id: 'open-match' }, paired: true });
      expect(mockMatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'open-match' },
          data: expect.objectContaining({
            player2Id: 'p-new',
            isBye: false,
            winnerId: null,
            finishedAt: null,
          }),
        })
      );
    });

    it('converts original BYE match (isBye=true) to real match when no open-slot match exists', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue(null as never);
      mockMatchFindFirst
        .mockResolvedValueOnce(null as never)            // no open slot match
        .mockResolvedValueOnce({ id: 'bye-match' } as never); // bye slot
      const createdPlayer = { id: 'p-bye', name: 'Carlos' };
      vi.mocked(prisma.player.create).mockResolvedValue(createdPlayer as never);
      mockMatchUpdate.mockResolvedValue({ id: 'bye-match' } as never);

      const result = await lateEntry('t-1', 'org-1', 'Carlos', false);

      expect(result).toMatchObject({ player: createdPlayer, match: { id: 'bye-match' }, paired: true });
      expect(mockMatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isBye: false, winnerId: null }),
        })
      );
    });

    it('creates new pending match when no open slot exists — paired: false', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue(null as never);
      mockMatchFindFirst
        .mockResolvedValueOnce(null as never) // no open slot
        .mockResolvedValueOnce(null as never); // no bye slot
      const createdPlayer = { id: 'p-new', name: 'Diana' };
      const createdMatch = { id: 'm-new' };
      vi.mocked(prisma.player.create).mockResolvedValue(createdPlayer as never);
      vi.mocked(prisma.match.create).mockResolvedValue(createdMatch as never);

      const result = await lateEntry('t-1', 'org-1', 'Diana', false);

      expect(result).toMatchObject({ player: createdPlayer, match: createdMatch, paired: false });
    });

    it('assigns next available bracket position for new pending match', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue(null as never);
      mockMatchFindFirst.mockResolvedValue(null as never);
      mockMatchAggregate.mockResolvedValue({ _max: { positionInBracket: 5 } } as never);
      vi.mocked(prisma.player.create).mockResolvedValue({ id: 'p-1', name: 'Elena' } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-1' } as never);

      await lateEntry('t-1', 'org-1', 'Elena', false);

      expect(prisma.match.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ positionInBracket: 6 }) })
      );
    });

    it('assigns position 1 when round has no matches yet', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue(null as never);
      mockMatchFindFirst.mockResolvedValue(null as never);
      mockMatchAggregate.mockResolvedValue({ _max: { positionInBracket: null } } as never);
      vi.mocked(prisma.player.create).mockResolvedValue({ id: 'p-1', name: 'Fabio' } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-1' } as never);

      await lateEntry('t-1', 'org-1', 'Fabio', false);

      expect(prisma.match.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ positionInBracket: 1 }) })
      );
    });
  });

  describe('no auto-advance guarantee', () => {
    it('never creates a match with isBye: true', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue(null as never);
      mockMatchFindFirst.mockResolvedValue(null as never);
      vi.mocked(prisma.player.create).mockResolvedValue({ id: 'p-1', name: 'Gabi' } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-1' } as never);

      await lateEntry('t-1', 'org-1', 'Gabi', false);

      const createCall = vi.mocked(prisma.match.create).mock.calls[0]?.[0];
      expect(createCall?.data).not.toHaveProperty('isBye', true);
    });

    it('never creates a match with winnerId pre-set', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue(null as never);
      mockMatchFindFirst.mockResolvedValue(null as never);
      vi.mocked(prisma.player.create).mockResolvedValue({ id: 'p-1', name: 'Henrique' } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-1' } as never);

      await lateEntry('t-1', 'org-1', 'Henrique', false);

      const createCall = vi.mocked(prisma.match.create).mock.calls[0]?.[0];
      expect(createCall?.data).not.toHaveProperty('winnerId');
    });
  });

  describe('financial accumulation', () => {
    it('uses lateEntryFee when set', async () => {
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ totalCollected: dec(100), lateEntryFee: dec(20), organizerPercentage: dec(20) }) as never
      );
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue(null as never);
      mockMatchFindFirst.mockResolvedValue(null as never);
      vi.mocked(prisma.player.create).mockResolvedValue({ id: 'p-new', name: 'Gabriela' } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-new' } as never);

      await lateEntry('t-1', 'org-1', 'Gabriela', false);

      expect(mockTournamentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalCollected: new Decimal(120),
            calculatedPrizePool: new Decimal(96),
            calculatedOrganizerAmount: new Decimal(24),
          }),
        })
      );
    });

    it('falls back to entryFee when lateEntryFee is null', async () => {
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ totalCollected: dec(50), lateEntryFee: null, entryFee: dec(50), organizerPercentage: dec(0) }) as never
      );
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue(null as never);
      mockMatchFindFirst.mockResolvedValue(null as never);
      vi.mocked(prisma.player.create).mockResolvedValue({ id: 'p-new', name: 'Gabriela' } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-new' } as never);

      await lateEntry('t-1', 'org-1', 'Gabriela', false);

      expect(mockTournamentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalCollected: new Decimal(100),
            calculatedPrizePool: new Decimal(100),
          }),
        })
      );
    });

    it('adds zero fee when both lateEntryFee and entryFee are null', async () => {
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ totalCollected: dec(80), lateEntryFee: null, entryFee: null, organizerPercentage: dec(0) }) as never
      );
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue(null as never);
      mockMatchFindFirst.mockResolvedValue(null as never);
      vi.mocked(prisma.player.create).mockResolvedValue({ id: 'p-new', name: 'Gabriela' } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-new' } as never);

      await lateEntry('t-1', 'org-1', 'Gabriela', false);

      expect(mockTournamentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalCollected: new Decimal(80),
          }),
        })
      );
    });
  });
});

// ─── rebuy ────────────────────────────────────────────────────────────────────

describe('rebuy', () => {
  describe('guards', () => {
    it('throws 404 when tournament not found', async () => {
      mockTournamentFindUnique.mockResolvedValue(null);
      await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Torneio nao encontrado',
      });
    });

    it('throws 403 when organizer does not own tournament', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament({ organizerId: 'org-2' }) as never);
      await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
        statusCode: 403,
        message: 'Acesso negado',
      });
    });

    it('throws 409 when tournament is not RUNNING', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament({ status: 'FINISHED' }) as never);
      await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
        statusCode: 409,
        message: 'Torneio nao esta em andamento',
      });
    });

    it('throws 409 when rebuy is not allowed', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament({ allowRebuy: false }) as never);
      await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
        statusCode: 409,
        message: 'Repescagem nao permitida neste torneio',
      });
    });

    it('throws 409 when player was not eliminated in Round 1', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockMatchFindFirst.mockResolvedValueOnce(null as never);
      await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
        statusCode: 409,
        message: 'Repescagem permitida apenas para jogadores eliminados na rodada 1',
      });
    });

    it('throws 409 when player was eliminated in Round 2+ (not Round 1)', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockMatchFindFirst.mockResolvedValueOnce(null as never);
      await expect(rebuy('t-1', 'org-1', 'p-r2')).rejects.toMatchObject({
        statusCode: 409,
        message: 'Repescagem permitida apenas para jogadores eliminados na rodada 1',
      });
    });
  });

  describe('pairing logic', () => {
    it('creates new repechage round and pending match when no round exists — paired: false', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockMatchFindFirst.mockResolvedValueOnce({ id: 'elim-match' } as never); // R1 elimination
      mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: false } as never);
      mockRoundFindFirst.mockResolvedValueOnce(null as never); // no repechage round
      // inside tx: lastRound + repechage creation
      mockRoundFindFirst.mockResolvedValueOnce({ roundNumber: 2 } as never);
      mockRoundCreate.mockResolvedValueOnce({ id: 'rep-round', roundNumber: 3 } as never);
      vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'p-1', name: 'Ana', isRebuy: true } as never);
      vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-rep' } as never);

      const result = await rebuy('t-1', 'org-1', 'p-1');

      expect(result).toMatchObject({ paired: false });
      expect(mockRoundCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isRepechage: true }),
        })
      );
    });

    it('pairs with waiting player when repechage round has open slot — paired: true', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockMatchFindFirst.mockResolvedValueOnce({ id: 'elim-match' } as never); // R1 elimination
      mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: false } as never);
      mockRoundFindFirst.mockResolvedValueOnce({ id: 'rep-round', roundNumber: 3 } as never); // repechage exists
      mockMatchFindFirst.mockResolvedValueOnce({ id: 'waiting-slot' } as never); // open slot
      vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'p-2', name: 'Bruno', isRebuy: true } as never);
      mockMatchUpdate.mockResolvedValueOnce({ id: 'waiting-slot' } as never);

      const result = await rebuy('t-1', 'org-1', 'p-2');

      expect(result).toMatchObject({ paired: true, match: { id: 'waiting-slot' } });
      expect(mockMatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'waiting-slot' },
          data: { player2Id: 'p-2' },
        })
      );
      expect(prisma.match.create).not.toHaveBeenCalled();
    });

    it('creates new pending match in existing repechage round when no open slot — paired: false', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockMatchFindFirst.mockResolvedValueOnce({ id: 'elim-match' } as never); // R1 elimination
      mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: false } as never);
      mockRoundFindFirst.mockResolvedValueOnce({ id: 'rep-round', roundNumber: 3 } as never); // repechage exists
      mockMatchFindFirst.mockResolvedValueOnce(null as never); // no open slot
      vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'p-3', name: 'Carol', isRebuy: true } as never);
      vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-new' } as never);

      const result = await rebuy('t-1', 'org-1', 'p-3');

      expect(result).toMatchObject({ paired: false });
      expect(prisma.match.create).toHaveBeenCalled();
      expect(mockMatchUpdate).not.toHaveBeenCalled();
    });
  });

  describe('no auto-advance guarantee', () => {
    it('never creates a match with isBye: true', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockMatchFindFirst.mockResolvedValueOnce({ id: 'elim-match' } as never);
      mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: false } as never);
      mockRoundFindFirst.mockResolvedValueOnce(null as never);
      mockRoundFindFirst.mockResolvedValueOnce(null as never); // lastRound
      mockRoundCreate.mockResolvedValueOnce({ id: 'rep-round', roundNumber: 2 } as never);
      vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'p-1', name: 'Diego', isRebuy: true } as never);
      vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-1' } as never);

      await rebuy('t-1', 'org-1', 'p-1');

      const createCall = vi.mocked(prisma.match.create).mock.calls[0]?.[0];
      expect(createCall?.data).not.toHaveProperty('isBye', true);
    });

    it('never creates a match with winnerId pre-set', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockMatchFindFirst.mockResolvedValueOnce({ id: 'elim-match' } as never);
      mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: false } as never);
      mockRoundFindFirst.mockResolvedValueOnce(null as never);
      mockRoundFindFirst.mockResolvedValueOnce(null as never); // lastRound
      mockRoundCreate.mockResolvedValueOnce({ id: 'rep-round', roundNumber: 2 } as never);
      vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'p-1', name: 'Diego', isRebuy: true } as never);
      vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-1' } as never);

      await rebuy('t-1', 'org-1', 'p-1');

      const createCall = vi.mocked(prisma.match.create).mock.calls[0]?.[0];
      expect(createCall?.data).not.toHaveProperty('winnerId');
    });
  });

  describe('double-rebuy block', () => {
    it('throws 409 when player already has isRebuy=true', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockMatchFindFirst.mockResolvedValueOnce({ id: 'elim-match' } as never);
      mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: true } as never);

      await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
        statusCode: 409,
        message: 'Jogador ja utilizou a repescagem neste torneio',
      });

      expect(prisma.player.update).not.toHaveBeenCalled();
      expect(prisma.match.create).not.toHaveBeenCalled();
    });
  });

  describe('financial accumulation', () => {
    it('uses rebuyFee when set', async () => {
      // totalCollected=200, rebuyFee=15, organizerPct=10%
      // newTotal=215, organizerAmount=21.5, prizePool=193.5
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ totalCollected: dec(200), rebuyFee: dec(15), organizerPercentage: dec(10) }) as never
      );
      mockMatchFindFirst.mockResolvedValueOnce({ id: 'elim-match' } as never);
      mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: false } as never);
      mockRoundFindFirst.mockResolvedValueOnce(null as never);
      mockRoundFindFirst.mockResolvedValueOnce(null as never); // lastRound
      mockRoundCreate.mockResolvedValueOnce({ id: 'rr', roundNumber: 2 } as never);
      vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'p-1', name: 'Karla', isRebuy: true } as never);
      vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-bye' } as never);

      await rebuy('t-1', 'org-1', 'p-1');

      expect(mockTournamentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalCollected: new Decimal(215),
            calculatedPrizePool: new Decimal(193.5),
            calculatedOrganizerAmount: new Decimal(21.5),
          }),
        })
      );
    });

    it('falls back to entryFee when rebuyFee is null', async () => {
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ totalCollected: dec(100), rebuyFee: null, entryFee: dec(50), organizerPercentage: dec(0) }) as never
      );
      mockMatchFindFirst.mockResolvedValueOnce({ id: 'elim-match' } as never);
      mockPlayerFindUnique.mockResolvedValueOnce({ isRebuy: false } as never);
      mockRoundFindFirst.mockResolvedValueOnce(null as never);
      mockRoundFindFirst.mockResolvedValueOnce(null as never);
      mockRoundCreate.mockResolvedValueOnce({ id: 'rr', roundNumber: 2 } as never);
      vi.mocked(prisma.player.update).mockResolvedValueOnce({ id: 'p-1', name: 'Karla', isRebuy: true } as never);
      vi.mocked(prisma.match.create).mockResolvedValueOnce({ id: 'm-bye' } as never);

      await rebuy('t-1', 'org-1', 'p-1');

      expect(mockTournamentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalCollected: new Decimal(150),
            calculatedPrizePool: new Decimal(150),
          }),
        })
      );
    });
  });
});

// ─── TournamentError ───────────────────────────────────────────────────────────

describe('TournamentError', () => {
  it('is an Error with statusCode and name', () => {
    const err = new TournamentError('Torneio nao encontrado', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Torneio nao encontrado');
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe('TournamentError');
  });
});
