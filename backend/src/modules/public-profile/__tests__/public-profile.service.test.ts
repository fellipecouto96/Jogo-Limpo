import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: {
    organizer: { findUnique: vi.fn() },
    tournament: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../bracket/bracket.service.js', () => ({
  fetchBracket: vi.fn().mockResolvedValue({
    rounds: [],
    totalRounds: 0,
    champion: null,
    tournament: {
      id: 't1',
      name: 'Copa',
      status: 'RUNNING',
      startedAt: null,
      finishedAt: null,
    },
  }),
}));

vi.mock('../../match/match.service.js', () => ({
  getTournamentStatistics: vi.fn().mockResolvedValue({
    totalMatches: 0,
    completedMatches: 0,
    totalGames: 0,
    highestScoringPlayer: null,
    biggestWinMargin: null,
    averageScorePerMatch: 0,
    finalScore: null,
    playerCount: 0,
  }),
}));

import {
  getPublicProfile,
  getPublicTournamentBySlug,
  getPublicTournamentDetail,
} from '../public-profile.service.js';
import { prisma } from '../../../shared/database/prisma.js';

const mockOrganizerFindUnique = vi.mocked(prisma.organizer.findUnique);
const mockTournamentFindUnique = vi.mocked(prisma.tournament.findUnique);
const mockTournamentFindMany = vi.mocked(prisma.tournament.findMany);
const mockTournamentCount = vi.mocked(prisma.tournament.count);
const mockTournamentUpdate = vi.mocked(prisma.tournament.update);

function asMock<T>(value: T): never {
  return value as never;
}

function makeOrganizer(
  overrides: Partial<{
    name: string;
    id: string;
    isPublicProfileEnabled: boolean;
  }> = {}
) {
  return {
    name: 'Joao Silva',
    id: 'org-1',
    isPublicProfileEnabled: true,
    ...overrides,
  };
}

function makeTournament(
  overrides: Partial<{
    id: string;
    publicSlug: string | null;
    name: string;
    status: string;
    organizerId: string;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    champion: { name: string } | null;
    rounds: Array<{ matches: Array<{ isBye: boolean }> }>;
  }> = {}
) {
  return {
    id: 't-1',
    publicSlug: 'copa-test-a7x2',
    name: 'Copa Teste',
    status: 'RUNNING',
    organizerId: 'org-1',
    createdAt: new Date('2026-02-10T12:00:00.000Z'),
    startedAt: new Date('2026-02-10T13:00:00.000Z'),
    finishedAt: null,
    champion: null,
    rounds: [{ matches: [{ isBye: false }, { isBye: false }] }],
    ...overrides,
  };
}

describe('public profile service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTournamentUpdate.mockResolvedValue({ id: 't-1' } as never);
    mockTournamentFindMany.mockResolvedValue(asMock([]));
    mockTournamentCount.mockResolvedValue(asMock(0));
  });

  describe('getPublicProfile', () => {
    it('returns null for unknown slug', async () => {
      mockOrganizerFindUnique.mockResolvedValue(null);
      const result = await getPublicProfile('inexistente');
      expect(result).toBeNull();
    });

    it('returns null when public profile is disabled', async () => {
      mockOrganizerFindUnique.mockResolvedValue(
        asMock(makeOrganizer({ isPublicProfileEnabled: false }))
      );
      const result = await getPublicProfile('joao-a7x2');
      expect(result).toBeNull();
    });

    it('returns read-only tournament cards with public slug', async () => {
      mockOrganizerFindUnique.mockResolvedValue(asMock(makeOrganizer()));
      mockTournamentFindMany.mockResolvedValue(
        asMock([
          {
            id: 't-1',
            publicSlug: 'copa-test-a7x2',
            name: 'Copa Teste',
            status: 'RUNNING',
            createdAt: new Date('2026-02-10T12:00:00.000Z'),
            startedAt: new Date('2026-02-10T13:00:00.000Z'),
            finishedAt: null,
            champion: null,
            rounds: [{ matches: [{ isBye: false }, { isBye: true }] }],
          },
        ])
      );
      mockTournamentCount.mockResolvedValue(asMock(1));

      const result = await getPublicProfile('joao-a7x2');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Joao Silva');
      expect(result!.tournaments[0].publicSlug).toBe('copa-test-a7x2');
      expect(result!.tournaments[0].playerCount).toBe(3);
      expect(
        (result!.tournaments[0] as unknown as Record<string, unknown>).entryFee
      ).toBeUndefined();
      expect(
        (result!.tournaments[0] as unknown as Record<string, unknown>).prizePool
      ).toBeUndefined();
    });
  });

  describe('getPublicTournamentDetail', () => {
    it('returns null for unknown organizer', async () => {
      mockOrganizerFindUnique.mockResolvedValue(null);
      const result = await getPublicTournamentDetail('nao-existe', 't-1');
      expect(result).toBeNull();
    });

    it('returns null when tournament belongs to another organizer', async () => {
      mockOrganizerFindUnique.mockResolvedValue(asMock(makeOrganizer({ id: 'org-1' })));
      mockTournamentFindUnique.mockResolvedValue(
        asMock(makeTournament({ organizerId: 'org-2' }))
      );

      const result = await getPublicTournamentDetail('joao-a7x2', 't-1');
      expect(result).toBeNull();
    });

    it('returns null for non-public statuses', async () => {
      mockOrganizerFindUnique.mockResolvedValue(asMock(makeOrganizer({ id: 'org-1' })));
      mockTournamentFindUnique.mockResolvedValue(asMock(makeTournament({ status: 'OPEN' })));

      const result = await getPublicTournamentDetail('joao-a7x2', 't-1');
      expect(result).toBeNull();
    });

    it('returns tournament detail without financial fields', async () => {
      mockOrganizerFindUnique.mockResolvedValue(asMock(makeOrganizer({ id: 'org-1' })));
      mockTournamentFindUnique.mockResolvedValue(asMock(makeTournament()));

      const result = await getPublicTournamentDetail('joao-a7x2', 't-1');
      expect(result).not.toBeNull();
      expect(result!.tournament.publicSlug).toBe('copa-test-a7x2');
      expect(result!.tournament.playerCount).toBe(4);
      expect(
        (result!.tournament as unknown as Record<string, unknown>).entryFee
      ).toBeUndefined();
      expect(
        (result!.tournament as unknown as Record<string, unknown>).prizePool
      ).toBeUndefined();
      expect(
        (result!.tournament as unknown as Record<string, unknown>).organizerId
      ).toBeUndefined();
    });
  });

  describe('getPublicTournamentBySlug', () => {
    it('returns null when slug does not exist', async () => {
      mockTournamentFindUnique.mockResolvedValue(null);
      const result = await getPublicTournamentBySlug('nao-existe');
      expect(result).toBeNull();
    });

    it('returns null when tournament status is OPEN', async () => {
      mockTournamentFindUnique.mockResolvedValue(asMock(makeTournament({ status: 'OPEN' })));
      const result = await getPublicTournamentBySlug('copa-open-a7x2');
      expect(result).toBeNull();
    });

    it('returns public detail for RUNNING tournament slug', async () => {
      mockTournamentFindUnique.mockResolvedValue(asMock(makeTournament()));
      const result = await getPublicTournamentBySlug('copa-test-a7x2');
      expect(result).not.toBeNull();
      expect(result!.tournament.publicSlug).toBe('copa-test-a7x2');
      expect(result!.tournament.status).toBe('RUNNING');
    });
  });
});
