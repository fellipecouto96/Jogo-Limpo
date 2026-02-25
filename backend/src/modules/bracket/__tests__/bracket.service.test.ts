import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: {
    tournament: { findUnique: vi.fn() },
  },
}));

vi.mock('../../../shared/logging/performance.service.js', () => ({
  withPerformanceLog: vi.fn(
    <T>(_journey: unknown, _op: unknown, run: () => Promise<T>) => run()
  ),
}));

import { fetchBracket, BracketError } from '../bracket.service.js';
import { prisma } from '../../../shared/database/prisma.js';

const mockFindUnique = vi.mocked(prisma.tournament.findUnique);

function asMock<T>(value: T): never {
  return value as never;
}

function makeMatch(
  overrides: Partial<{
    id: string;
    positionInBracket: number;
    isBye: boolean;
    finishedAt: Date | null;
    player1Score: number | null;
    player2Score: number | null;
    player1: { id: string; name: string; isRebuy: boolean };
    player2: { id: string; name: string; isRebuy: boolean } | null;
    winner: { id: string; name: string; isRebuy: boolean } | null;
  }> = {}
) {
  return {
    id: overrides.id ?? 'm1',
    positionInBracket: overrides.positionInBracket ?? 1,
    isBye: overrides.isBye ?? false,
    finishedAt: overrides.finishedAt ?? null,
    player1Score: overrides.player1Score ?? null,
    player2Score: overrides.player2Score ?? null,
    player1: overrides.player1 ?? { id: 'p1', name: 'Alice', isRebuy: false },
    player2: overrides.player2 !== undefined ? overrides.player2 : { id: 'p2', name: 'Bob', isRebuy: false },
    winner: overrides.winner !== undefined ? overrides.winner : null,
  };
}

function makeRound(
  overrides: Partial<{
    id: string;
    roundNumber: number;
    isRepechage: boolean;
    matches: ReturnType<typeof makeMatch>[];
  }> = {}
) {
  return {
    id: overrides.id ?? 'r1',
    roundNumber: overrides.roundNumber ?? 1,
    isRepechage: overrides.isRepechage ?? false,
    matches: overrides.matches ?? [],
  };
}

function makeTournament(
  overrides: Partial<{
    id: string;
    name: string;
    status: string;
    startedAt: Date | null;
    finishedAt: Date | null;
    rounds: ReturnType<typeof makeRound>[];
  }> = {}
) {
  return {
    id: overrides.id ?? 't1',
    name: overrides.name ?? 'Copa Teste',
    status: overrides.status ?? 'RUNNING',
    startedAt: overrides.startedAt ?? null,
    finishedAt: overrides.finishedAt ?? null,
    rounds: overrides.rounds ?? [],
  };
}

describe('fetchBracket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws BracketError 404 when tournament is not found', async () => {
    mockFindUnique.mockResolvedValue(asMock(null));

    await expect(fetchBracket('nonexistent')).rejects.toMatchObject({
      name: 'BracketError',
      statusCode: 404,
    });
  });

  it('returns totalRounds 0 and no champion for tournament without rounds', async () => {
    mockFindUnique.mockResolvedValue(asMock(makeTournament({ rounds: [] })));

    const result = await fetchBracket('t1');

    expect(result.totalRounds).toBe(0);
    expect(result.champion).toBeNull();
    expect(result.rounds).toHaveLength(0);
  });

  it('excludes repechage rounds from totalRounds count', async () => {
    const tournament = makeTournament({
      rounds: [
        makeRound({ id: 'r1', roundNumber: 1, isRepechage: false }),
        makeRound({ id: 'r2', roundNumber: 2, isRepechage: true }),
        makeRound({ id: 'r3', roundNumber: 3, isRepechage: false }),
      ],
    });
    mockFindUnique.mockResolvedValue(asMock(tournament));

    const result = await fetchBracket('t1');

    // 2 main rounds, repechage excluded
    expect(result.totalRounds).toBe(2);
    // All 3 rounds still present in response
    expect(result.rounds).toHaveLength(3);
  });

  it('labels repechage round as "Rodada de Repescagem"', async () => {
    const tournament = makeTournament({
      rounds: [
        makeRound({ id: 'r1', roundNumber: 1, isRepechage: true }),
      ],
    });
    mockFindUnique.mockResolvedValue(asMock(tournament));

    const result = await fetchBracket('t1');

    expect(result.rounds[0].label).toBe('Rodada de Repescagem');
    expect(result.rounds[0].isRepechage).toBe(true);
  });

  it('returns champion when tournament is FINISHED and final match has a winner', async () => {
    const winnerDate = new Date('2025-01-01T12:00:00Z');
    const champion = { id: 'p1', name: 'Alice', isRebuy: false };
    const tournament = makeTournament({
      status: 'FINISHED',
      finishedAt: winnerDate,
      rounds: [
        makeRound({
          id: 'r1',
          roundNumber: 1,
          matches: [
            makeMatch({
              id: 'm1',
              positionInBracket: 1,
              finishedAt: winnerDate,
              winner: champion,
            }),
          ],
        }),
      ],
    });
    mockFindUnique.mockResolvedValue(asMock(tournament));

    const result = await fetchBracket('t1');

    expect(result.champion).toMatchObject({ id: 'p1', name: 'Alice' });
  });

  it('returns null champion when tournament is RUNNING even with match winners', async () => {
    const tournament = makeTournament({
      status: 'RUNNING',
      rounds: [
        makeRound({
          id: 'r1',
          roundNumber: 1,
          matches: [
            makeMatch({
              id: 'm1',
              positionInBracket: 1,
              winner: { id: 'p1', name: 'Alice', isRebuy: false },
            }),
          ],
        }),
      ],
    });
    mockFindUnique.mockResolvedValue(asMock(tournament));

    const result = await fetchBracket('t1');

    expect(result.champion).toBeNull();
  });

  it('applies correct labels: Final, Semifinal, Quartas de Final, Oitavas de Final', async () => {
    const tournament = makeTournament({
      rounds: [
        makeRound({ id: 'r1', roundNumber: 1 }),
        makeRound({ id: 'r2', roundNumber: 2 }),
        makeRound({ id: 'r3', roundNumber: 3 }),
        makeRound({ id: 'r4', roundNumber: 4 }),
      ],
    });
    mockFindUnique.mockResolvedValue(asMock(tournament));

    const result = await fetchBracket('t1');

    // totalRounds = 4, so labels from round 1..4
    expect(result.rounds[0].label).toBe('Oitavas de Final'); // roundsFromEnd = 3
    expect(result.rounds[1].label).toBe('Quartas de Final'); // roundsFromEnd = 2
    expect(result.rounds[2].label).toBe('Semifinal');        // roundsFromEnd = 1
    expect(result.rounds[3].label).toBe('Final');            // roundsFromEnd = 0
  });

  it('uses "Rodada N" fallback label for rounds beyond the predefined labels', async () => {
    // 6 rounds: rounds 1 and 2 would map to roundsFromEnd 5 and 4 (no predefined label)
    const rounds = Array.from({ length: 6 }, (_, i) =>
      makeRound({ id: `r${i + 1}`, roundNumber: i + 1 })
    );
    mockFindUnique.mockResolvedValue(asMock(makeTournament({ rounds })));

    const result = await fetchBracket('t1');

    expect(result.rounds[0].label).toBe('Rodada 1'); // roundsFromEnd = 5
    expect(result.rounds[1].label).toBe('Rodada 2'); // roundsFromEnd = 4
  });

  it('populates match fields correctly', async () => {
    const matchDate = new Date('2025-01-01T10:00:00Z');
    const tournament = makeTournament({
      rounds: [
        makeRound({
          id: 'r1',
          roundNumber: 1,
          matches: [
            makeMatch({
              id: 'm1',
              positionInBracket: 2,
              isBye: true,
              finishedAt: matchDate,
              player1Score: 3,
              player2Score: 1,
              player1: { id: 'p1', name: 'Alice', isRebuy: false },
              player2: { id: 'p2', name: 'Bob', isRebuy: true },
              winner: { id: 'p1', name: 'Alice', isRebuy: false },
            }),
          ],
        }),
      ],
    });
    mockFindUnique.mockResolvedValue(asMock(tournament));

    const result = await fetchBracket('t1');

    const match = result.rounds[0].matches[0];
    expect(match.id).toBe('m1');
    expect(match.positionInBracket).toBe(2);
    expect(match.isBye).toBe(true);
    expect(match.finishedAt).toBe(matchDate.toISOString());
    expect(match.player1Score).toBe(3);
    expect(match.player2Score).toBe(1);
    expect(match.player1).toEqual({ id: 'p1', name: 'Alice', isRebuy: false });
    expect(match.player2).toEqual({ id: 'p2', name: 'Bob', isRebuy: true });
    expect(match.winner).toEqual({ id: 'p1', name: 'Alice', isRebuy: false });
  });

  it('returns null for player2 and winner when not set', async () => {
    const tournament = makeTournament({
      rounds: [
        makeRound({
          matches: [
            makeMatch({ player2: null, winner: null }),
          ],
        }),
      ],
    });
    mockFindUnique.mockResolvedValue(asMock(tournament));

    const result = await fetchBracket('t1');

    const match = result.rounds[0].matches[0];
    expect(match.player2).toBeNull();
    expect(match.winner).toBeNull();
  });

  it('returns null champion when FINISHED but no match at position 1 in final round', async () => {
    const tournament = makeTournament({
      status: 'FINISHED',
      rounds: [
        makeRound({
          id: 'r1',
          roundNumber: 1,
          matches: [
            makeMatch({ id: 'm1', positionInBracket: 2, winner: { id: 'p1', name: 'Alice', isRebuy: false } }),
          ],
        }),
      ],
    });
    mockFindUnique.mockResolvedValue(asMock(tournament));

    const result = await fetchBracket('t1');

    // positionInBracket === 1 not found → champion is null
    expect(result.champion).toBeNull();
  });

  it('returns null champion when FINISHED but final round has no completed match', async () => {
    const tournament = makeTournament({
      status: 'FINISHED',
      rounds: [
        makeRound({
          id: 'r1',
          roundNumber: 1,
          matches: [makeMatch({ id: 'm1', positionInBracket: 1, winner: null })],
        }),
      ],
    });
    mockFindUnique.mockResolvedValue(asMock(tournament));

    const result = await fetchBracket('t1');

    expect(result.champion).toBeNull();
  });

  it('returns tournament metadata with ISO date strings', async () => {
    const startedAt = new Date('2025-01-01T08:00:00Z');
    const finishedAt = new Date('2025-01-01T20:00:00Z');
    const tournament = makeTournament({
      id: 'abc',
      name: 'Final Copa',
      status: 'FINISHED',
      startedAt,
      finishedAt,
    });
    mockFindUnique.mockResolvedValue(asMock(tournament));

    const result = await fetchBracket('abc');

    expect(result.tournament.id).toBe('abc');
    expect(result.tournament.name).toBe('Final Copa');
    expect(result.tournament.status).toBe('FINISHED');
    expect(result.tournament.startedAt).toBe(startedAt.toISOString());
    expect(result.tournament.finishedAt).toBe(finishedAt.toISOString());
  });
});
