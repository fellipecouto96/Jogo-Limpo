/**
 * Security & access-control tests for the public profile service.
 *
 * These tests verify that:
 * - Disabled profiles return null (not exposed)
 * - Unknown slugs return null (safe 404)
 * - Financial fields are hidden unless showFinancials = true
 * - email / passwordHash / organizerId are NEVER returned
 * - DRAFT / OPEN tournaments are not listed
 * - Cross-organizer tournament access is blocked
 * - Tournament owned by different organizer returns null
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Prisma and dependent services BEFORE importing the service ──────────
vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: {
    organizer: { findUnique: vi.fn() },
    tournament: { findUnique: vi.fn() },
  },
}));

vi.mock('../../bracket/bracket.service.js', () => ({
  fetchBracket: vi.fn().mockResolvedValue({
    rounds: [],
    totalRounds: 0,
    champion: null,
    tournament: { id: 't1', name: 'T', status: 'RUNNING', startedAt: null, finishedAt: null },
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
  getPublicTournamentDetail,
} from '../public-profile.service.js';
import { prisma } from '../../../shared/database/prisma.js';

const mockOrgFindUnique = vi.mocked(prisma.organizer.findUnique);
const mockTournFindUnique = vi.mocked(prisma.tournament.findUnique);

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeOrganizer(overrides: Partial<{
  name: string;
  isPublicProfileEnabled: boolean;
  showFinancials: boolean;
  id: string;
  tournaments: unknown[];
}> = {}) {
  return {
    name: 'João Silva',
    email: 'joao@example.com',
    passwordHash: 'hashed',
    publicSlug: 'joao-a7x2',
    createdAt: new Date('2026-01-01'),
    isPublicProfileEnabled: true,
    showFinancials: false,
    id: 'org-1',
    tournaments: [],
    ...overrides,
  };
}

function makeTournament(overrides: Partial<{
  id: string;
  name: string;
  status: string;
  organizerId: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  entryFee: unknown;
  prizePool: unknown;
  champion: { name: string } | null;
  matches: { player1Id: string; player2Id: string | null }[];
}> = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    id: 't-1',
    name: 'Copa Test',
    status: 'RUNNING',
    organizerId: 'org-1',
    startedAt: null,
    finishedAt: null,
    entryFee: null,
    prizePool: null,
    champion: null,
    matches: [{ player1Id: 'p1', player2Id: 'p2' }],
    ...overrides,
  } as any;
}

// ── getPublicProfile ──────────────────────────────────────────────────────────

describe('getPublicProfile – security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for unknown slug', async () => {
    mockOrgFindUnique.mockResolvedValue(null);
    const result = await getPublicProfile('not-a-real-slug');
    expect(result).toBeNull();
  });

  it('returns null when isPublicProfileEnabled = false', async () => {
    mockOrgFindUnique.mockResolvedValue(
      makeOrganizer({ isPublicProfileEnabled: false })
    );
    const result = await getPublicProfile('joao-a7x2');
    expect(result).toBeNull();
  });

  it('returns organizer name for valid enabled profile', async () => {
    mockOrgFindUnique.mockResolvedValue(makeOrganizer());
    const result = await getPublicProfile('joao-a7x2');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('João Silva');
  });

  it('never exposes email in response', async () => {
    const orgWithEmail = { ...makeOrganizer(), email: 'secret@example.com' };
    mockOrgFindUnique.mockResolvedValue(orgWithEmail);
    const result = await getPublicProfile('joao-a7x2');
    expect(result).not.toBeNull();
    expect((result as unknown as Record<string, unknown>).email).toBeUndefined();
  });

  it('never exposes passwordHash in response', async () => {
    const orgWithPwd = { ...makeOrganizer(), passwordHash: 'bcrypt$hash' };
    mockOrgFindUnique.mockResolvedValue(orgWithPwd);
    const result = await getPublicProfile('joao-a7x2');
    expect((result as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('never exposes organizerId in response', async () => {
    mockOrgFindUnique.mockResolvedValue(makeOrganizer());
    const result = await getPublicProfile('joao-a7x2');
    expect((result as unknown as Record<string, unknown>).organizerId).toBeUndefined();
    expect((result as unknown as Record<string, unknown>).id).toBeUndefined();
  });

  it('excludes DRAFT tournaments from public listing (DB-level filter)', async () => {
    // The WHERE status IN [RUNNING, FINISHED] filter lives in the Prisma query.
    // We simulate what the real DB returns: an empty list (DRAFT filtered out).
    mockOrgFindUnique.mockResolvedValue(makeOrganizer({ tournaments: [] }));
    const result = await getPublicProfile('joao-a7x2');
    expect(result!.tournaments).toHaveLength(0);
  });

  it('hides entryFee when showFinancials = false', async () => {
    const org = makeOrganizer({
      showFinancials: false,
      tournaments: [
        {
          id: 't-1',
          name: 'Copa Test',
          status: 'RUNNING',
          createdAt: new Date(),
          startedAt: new Date(),
          finishedAt: null,
          entryFee: { toNumber: () => 50, toString: () => '50' },
          prizePool: { toNumber: () => 400, toString: () => '400' },
          champion: null,
          matches: [{ player1Id: 'p1', player2Id: 'p2' }],
        },
      ],
    });
    mockOrgFindUnique.mockResolvedValue(org);
    const result = await getPublicProfile('joao-a7x2');
    expect(result!.tournaments[0].entryFee).toBeNull();
    expect(result!.tournaments[0].prizePool).toBeNull();
  });

  it('exposes entryFee when showFinancials = true', async () => {
    const org = makeOrganizer({
      showFinancials: true,
      tournaments: [
        {
          id: 't-1',
          name: 'Copa Test',
          status: 'RUNNING',
          createdAt: new Date(),
          startedAt: new Date(),
          finishedAt: null,
          entryFee: 50,
          prizePool: 400,
          champion: null,
          matches: [{ player1Id: 'p1', player2Id: 'p2' }],
        },
      ],
    });
    mockOrgFindUnique.mockResolvedValue(org);
    const result = await getPublicProfile('joao-a7x2');
    expect(result!.tournaments[0].entryFee).toBe(50);
    expect(result!.tournaments[0].prizePool).toBe(400);
  });

  it('returns empty tournaments array for organizer with no visible tournaments', async () => {
    mockOrgFindUnique.mockResolvedValue(makeOrganizer({ tournaments: [] }));
    const result = await getPublicProfile('joao-a7x2');
    expect(result!.tournaments).toEqual([]);
  });
});

// ── getPublicTournamentDetail ─────────────────────────────────────────────────

describe('getPublicTournamentDetail – security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for unknown organizer slug', async () => {
    mockOrgFindUnique.mockResolvedValue(null);
    const result = await getPublicTournamentDetail('not-real', 't-1');
    expect(result).toBeNull();
  });

  it('returns null when profile is disabled', async () => {
    mockOrgFindUnique.mockResolvedValue(
      makeOrganizer({ isPublicProfileEnabled: false })
    );
    const result = await getPublicTournamentDetail('joao-a7x2', 't-1');
    expect(result).toBeNull();
  });

  it('returns null when tournament does not belong to this organizer', async () => {
    mockOrgFindUnique.mockResolvedValue(makeOrganizer({ id: 'org-1' }));
    mockTournFindUnique.mockResolvedValue(
      makeTournament({ organizerId: 'org-OTHER' })
    );
    const result = await getPublicTournamentDetail('joao-a7x2', 't-1');
    expect(result).toBeNull();
  });

  it('returns null for unknown tournament id', async () => {
    mockOrgFindUnique.mockResolvedValue(makeOrganizer({ id: 'org-1' }));
    mockTournFindUnique.mockResolvedValue(null);
    const result = await getPublicTournamentDetail('joao-a7x2', 'no-such-id');
    expect(result).toBeNull();
  });

  it('returns null for DRAFT tournament (not publicly accessible)', async () => {
    mockOrgFindUnique.mockResolvedValue(makeOrganizer({ id: 'org-1' }));
    mockTournFindUnique.mockResolvedValue(
      makeTournament({ status: 'DRAFT', organizerId: 'org-1' })
    );
    const result = await getPublicTournamentDetail('joao-a7x2', 't-1');
    expect(result).toBeNull();
  });

  it('returns null for OPEN tournament (not publicly accessible)', async () => {
    mockOrgFindUnique.mockResolvedValue(makeOrganizer({ id: 'org-1' }));
    mockTournFindUnique.mockResolvedValue(
      makeTournament({ status: 'OPEN', organizerId: 'org-1' })
    );
    const result = await getPublicTournamentDetail('joao-a7x2', 't-1');
    expect(result).toBeNull();
  });

  it('returns tournament detail for RUNNING tournament', async () => {
    mockOrgFindUnique.mockResolvedValue(makeOrganizer({ id: 'org-1' }));
    mockTournFindUnique.mockResolvedValue(
      makeTournament({ status: 'RUNNING', organizerId: 'org-1' })
    );
    const result = await getPublicTournamentDetail('joao-a7x2', 't-1');
    expect(result).not.toBeNull();
    expect(result!.tournament.status).toBe('RUNNING');
  });

  it('returns tournament detail for FINISHED tournament', async () => {
    mockOrgFindUnique.mockResolvedValue(makeOrganizer({ id: 'org-1' }));
    mockTournFindUnique.mockResolvedValue(
      makeTournament({
        status: 'FINISHED',
        organizerId: 'org-1',
        champion: { name: 'Pedro' },
      })
    );
    const result = await getPublicTournamentDetail('joao-a7x2', 't-1');
    expect(result).not.toBeNull();
    expect(result!.tournament.championName).toBe('Pedro');
  });

  it('hides financial data when showFinancials = false', async () => {
    mockOrgFindUnique.mockResolvedValue(
      makeOrganizer({ id: 'org-1', showFinancials: false })
    );
    mockTournFindUnique.mockResolvedValue(
      makeTournament({
        status: 'RUNNING',
        organizerId: 'org-1',
        entryFee: 30,
        prizePool: 240,
      })
    );
    const result = await getPublicTournamentDetail('joao-a7x2', 't-1');
    expect(result!.tournament.entryFee).toBeNull();
    expect(result!.tournament.prizePool).toBeNull();
  });

  it('exposes financial data when showFinancials = true', async () => {
    mockOrgFindUnique.mockResolvedValue(
      makeOrganizer({ id: 'org-1', showFinancials: true })
    );
    mockTournFindUnique.mockResolvedValue(
      makeTournament({
        status: 'RUNNING',
        organizerId: 'org-1',
        entryFee: 30,
        prizePool: 240,
      })
    );
    const result = await getPublicTournamentDetail('joao-a7x2', 't-1');
    expect(result!.tournament.entryFee).toBe(30);
    expect(result!.tournament.prizePool).toBe(240);
  });

  it('never exposes organizerId in tournament detail', async () => {
    mockOrgFindUnique.mockResolvedValue(makeOrganizer({ id: 'org-1' }));
    mockTournFindUnique.mockResolvedValue(
      makeTournament({ status: 'RUNNING', organizerId: 'org-1' })
    );
    const result = await getPublicTournamentDetail('joao-a7x2', 't-1');
    expect(
      (result!.tournament as unknown as Record<string, unknown>).organizerId
    ).toBeUndefined();
  });
});
