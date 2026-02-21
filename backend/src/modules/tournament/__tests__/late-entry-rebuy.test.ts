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

function dec(value: number) {
  return new Decimal(value);
}

function makeTournament(overrides: Record<string, unknown> = {}) {
  return {
    organizerId: 'org-1',
    status: 'RUNNING',
    allowLateEntry: true,
    allowLateEntryUntilRound: 3,
    allowRebuy: true,
    allowRebuyUntilRound: 2,
    lateEntryFee: dec(20),
    rebuyFee: dec(15),
    entryFee: dec(50),
    totalCollected: dec(100),
    organizerPercentage: dec(20),
    ...overrides,
  };
}

function makeRound(roundNumber = 1) {
  return { id: 'round-1', roundNumber };
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

    it('throws 409 when no active round', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(null);
      await expect(lateEntry('t-1', 'org-1', 'Ana', false)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Nenhuma rodada ativa encontrada',
      });
    });

    it('throws 409 when current round exceeds allowLateEntryUntilRound', async () => {
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ allowLateEntryUntilRound: 1 }) as never
      );
      mockRoundFindFirst.mockResolvedValue(makeRound(2) as never);
      await expect(lateEntry('t-1', 'org-1', 'Ana', false)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Entrada tardia encerrada. Permitida apenas ate a rodada 1',
      });
    });
  });

  describe('duplicate detection', () => {
    beforeEach(() => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
    });

    it('returns isDuplicate when player name exists (case-insensitive)', async () => {
      mockPlayerFindFirst.mockResolvedValue({ name: 'Ana Silva' } as never);

      const result = await lateEntry('t-1', 'org-1', 'ana silva', false);

      expect(result).toEqual({ isDuplicate: true, existingName: 'Ana Silva' });
    });

    it('returns isDuplicate when name has leading/trailing spaces (trimmed before check)', async () => {
      mockPlayerFindFirst.mockResolvedValue({ name: 'João' } as never);

      const result = await lateEntry('t-1', 'org-1', '  João  ', false);

      expect(result).toEqual({ isDuplicate: true, existingName: 'João' });
    });

    it('passes trimmed name to duplicate query (not raw input)', async () => {
      mockPlayerFindFirst.mockResolvedValue(null);
      vi.mocked(prisma.player.create).mockResolvedValue({ id: 'p-new', name: 'Carlos' } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-new' } as never);

      await lateEntry('t-1', 'org-1', '  Carlos  ', false);

      expect(mockPlayerFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ equals: 'Carlos' }),
          }),
        })
      );
    });

    it('bypasses duplicate check when force=true', async () => {
      mockPlayerFindFirst.mockResolvedValue({ name: 'Ana Silva' } as never);
      const createdPlayer = { id: 'p-new', name: 'Ana Silva' };
      const createdMatch = { id: 'm-new' };
      vi.mocked(prisma.player.create).mockResolvedValue(createdPlayer as never);
      vi.mocked(prisma.match.create).mockResolvedValue(createdMatch as never);

      const result = await lateEntry('t-1', 'org-1', 'Ana Silva', true);

      // duplicate check should not be called when force=true
      expect(mockPlayerFindFirst).not.toHaveBeenCalled();
      expect(result).toEqual({ player: createdPlayer, match: createdMatch });
    });
  });

  describe('success path', () => {
    beforeEach(() => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      mockPlayerFindFirst.mockResolvedValue(null);
    });

    it('creates player and bye match, returns result', async () => {
      const createdPlayer = { id: 'p-new', name: 'Bruno' };
      const createdMatch = { id: 'm-new' };
      vi.mocked(prisma.player.create).mockResolvedValue(createdPlayer as never);
      vi.mocked(prisma.match.create).mockResolvedValue(createdMatch as never);

      const result = await lateEntry('t-1', 'org-1', '  Bruno  ', false);

      expect(result).toEqual({ player: createdPlayer, match: createdMatch });
    });

    it('trims player name before creating', async () => {
      const createdPlayer = { id: 'p-new', name: 'Carlos' };
      vi.mocked(prisma.player.create).mockResolvedValue(createdPlayer as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-new' } as never);

      await lateEntry('t-1', 'org-1', '  Carlos  ', false);

      expect(prisma.player.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Carlos' }) })
      );
    });

    it('assigns next available bracket position', async () => {
      mockMatchAggregate.mockResolvedValue({ _max: { positionInBracket: 5 } } as never);
      vi.mocked(prisma.player.create).mockResolvedValue({ id: 'p-1', name: 'Diana' } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-1' } as never);

      await lateEntry('t-1', 'org-1', 'Diana', false);

      expect(prisma.match.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ positionInBracket: 6 }) })
      );
    });

    it('assigns position 1 when round is empty', async () => {
      mockMatchAggregate.mockResolvedValue({ _max: { positionInBracket: null } } as never);
      vi.mocked(prisma.player.create).mockResolvedValue({ id: 'p-1', name: 'Elena' } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-1' } as never);

      await lateEntry('t-1', 'org-1', 'Elena', false);

      expect(prisma.match.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ positionInBracket: 1 }) })
      );
    });

    it('creates match as bye with winner set immediately', async () => {
      const player = { id: 'p-new', name: 'Fabio' };
      vi.mocked(prisma.player.create).mockResolvedValue(player as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-new' } as never);

      await lateEntry('t-1', 'org-1', 'Fabio', false);

      expect(prisma.match.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isBye: true,
            winnerId: player.id,
            player1Id: player.id,
          }),
        })
      );
    });
  });

  describe('financial accumulation', () => {
    beforeEach(() => {
      mockPlayerFindFirst.mockResolvedValue(null);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      vi.mocked(prisma.player.create).mockResolvedValue({ id: 'p-new', name: 'Gabriela' } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-new' } as never);
    });

    it('uses lateEntryFee when set', async () => {
      // totalCollected=100, lateEntryFee=20, organizerPct=20%
      // newTotal=120, organizerAmount=24, prizePool=96
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ totalCollected: dec(100), lateEntryFee: dec(20), organizerPercentage: dec(20) }) as never
      );

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
      // totalCollected=50, entryFee=50 (fallback), organizerPct=0%
      // newTotal=100, organizerAmount=0, prizePool=100
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ totalCollected: dec(50), lateEntryFee: null, entryFee: dec(50), organizerPercentage: dec(0) }) as never
      );

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

    it('throws 409 when no active round', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(null);
      await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
        statusCode: 409,
        message: 'Nenhuma rodada ativa encontrada',
      });
    });

    it('throws 409 when current round exceeds allowRebuyUntilRound', async () => {
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ allowRebuyUntilRound: 1 }) as never
      );
      mockRoundFindFirst.mockResolvedValue(makeRound(2) as never);
      await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
        statusCode: 409,
        message: 'Repescagem encerrada. Permitida apenas ate a rodada 1',
      });
    });

    it('throws 409 when player is not eliminated', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValue(null);
      await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
        statusCode: 409,
        message: 'Jogador nao esta eliminado ou nao pertence a este torneio',
      });
    });
  });

  describe('success path', () => {
    beforeEach(() => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValue({ id: 'elim-match' } as never);
      mockPlayerFindUnique.mockResolvedValue({ isRebuy: false } as never);
    });

    it('sets isRebuy=true on player and creates bye match', async () => {
      const updatedPlayer = { id: 'p-1', name: 'Henrique', isRebuy: true };
      const createdMatch = { id: 'm-bye' };
      vi.mocked(prisma.player.update).mockResolvedValue(updatedPlayer as never);
      vi.mocked(prisma.match.create).mockResolvedValue(createdMatch as never);

      const result = await rebuy('t-1', 'org-1', 'p-1');

      expect(result).toEqual({ player: updatedPlayer, match: createdMatch });
      expect(prisma.player.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isRebuy: true } })
      );
    });

    it('creates bye match with player as winner', async () => {
      vi.mocked(prisma.player.update).mockResolvedValue({ id: 'p-1', name: 'Ines', isRebuy: true } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-bye' } as never);

      await rebuy('t-1', 'org-1', 'p-1');

      expect(prisma.match.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isBye: true,
            winnerId: 'p-1',
            player1Id: 'p-1',
          }),
        })
      );
    });

    it('assigns next available bracket position', async () => {
      mockMatchAggregate.mockResolvedValue({ _max: { positionInBracket: 7 } } as never);
      vi.mocked(prisma.player.update).mockResolvedValue({ id: 'p-1', name: 'Joao', isRebuy: true } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-bye' } as never);

      await rebuy('t-1', 'org-1', 'p-1');

      expect(prisma.match.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ positionInBracket: 8 }) })
      );
    });
  });

  describe('financial accumulation', () => {
    beforeEach(() => {
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValue({ id: 'elim-match' } as never);
      mockPlayerFindUnique.mockResolvedValue({ isRebuy: false } as never);
      vi.mocked(prisma.player.update).mockResolvedValue({ id: 'p-1', name: 'Karla', isRebuy: true } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-bye' } as never);
    });

    it('uses rebuyFee when set', async () => {
      // totalCollected=200, rebuyFee=15, organizerPct=10%
      // newTotal=215, organizerAmount=21.5, prizePool=193.5
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ totalCollected: dec(200), rebuyFee: dec(15), organizerPercentage: dec(10) }) as never
      );

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
      // totalCollected=100, entryFee=50, organizerPct=0%
      // newTotal=150, prizePool=150
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ totalCollected: dec(100), rebuyFee: null, entryFee: dec(50), organizerPercentage: dec(0) }) as never
      );

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

  describe('double-rebuy block', () => {
    it('throws 409 when player already has isRebuy=true', async () => {
      mockTournamentFindUnique.mockResolvedValue(makeTournament() as never);
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValue({ id: 'elim-match' } as never);
      mockPlayerFindUnique.mockResolvedValue({ isRebuy: true } as never);

      await expect(rebuy('t-1', 'org-1', 'p-1')).rejects.toMatchObject({
        statusCode: 409,
        message: 'Jogador ja utilizou a repescagem neste torneio',
      });

      expect(prisma.player.update).not.toHaveBeenCalled();
      expect(prisma.match.create).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      mockRoundFindFirst.mockResolvedValue(makeRound(1) as never);
      vi.mocked(prisma.match.findFirst).mockResolvedValue({ id: 'elim-match' } as never);
      mockPlayerFindUnique.mockResolvedValue({ isRebuy: false } as never);
      vi.mocked(prisma.player.update).mockResolvedValue({ id: 'p-1', name: 'Lucas', isRebuy: true } as never);
      vi.mocked(prisma.match.create).mockResolvedValue({ id: 'm-bye' } as never);
    });

    it('handles 0 rebuyFee without changing totalCollected', async () => {
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ totalCollected: dec(400), rebuyFee: dec(0), organizerPercentage: dec(30) }) as never
      );

      await rebuy('t-1', 'org-1', 'p-1');

      expect(mockTournamentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalCollected: new Decimal(400),
            calculatedPrizePool: new Decimal(280),
            calculatedOrganizerAmount: new Decimal(120),
          }),
        })
      );
    });

    it('respects configurable allowRebuyUntilRound (round 3)', async () => {
      mockTournamentFindUnique.mockResolvedValue(
        makeTournament({ allowRebuyUntilRound: 3 }) as never
      );
      mockRoundFindFirst.mockResolvedValue(makeRound(3) as never);

      const result = await rebuy('t-1', 'org-1', 'p-1');

      expect(result).toHaveProperty('player');
      expect(result).toHaveProperty('match');
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
