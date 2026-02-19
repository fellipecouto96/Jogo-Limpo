/**
 * Tests for usePublicProfile and usePublicTournament hooks.
 *
 * Verifies:
 * - Correct API URL construction (/public/organizers/:slug)
 * - Loading state management
 * - 404 response → "Perfil nao encontrado" error
 * - Network failure → graceful error message
 * - Successful response → data populated
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePublicProfile, usePublicTournament } from '../usePublicProfile.ts';

// Mock getApiUrl to return predictable URLs
vi.mock('../../../shared/api.ts', () => ({
  getApiUrl: (path: string) => `https://api.test${path}`,
}));

const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockSuccess(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
    status: 200,
  });
}

function mockError(status: number) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({}),
  });
}

function mockNetworkFailure() {
  mockFetch.mockRejectedValueOnce(new Error('Network error'));
}

// ── usePublicProfile ──────────────────────────────────────────────────────────

describe('usePublicProfile', () => {
  it('starts in loading state', () => {
    mockFetch.mockResolvedValueOnce(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => usePublicProfile('joao-a7x2'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('calls the correct public API endpoint', async () => {
    mockSuccess({ name: 'João', tournaments: [] });
    const { result } = renderHook(() => usePublicProfile('joao-a7x2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test/public/organizers/joao-a7x2'
    );
  });

  it('does NOT include Authorization header (public endpoint)', async () => {
    mockSuccess({ name: 'João', tournaments: [] });
    renderHook(() => usePublicProfile('joao-a7x2'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const callArgs = mockFetch.mock.calls[0];
    const options = callArgs[1] as RequestInit | undefined;
    const authHeader =
      (options?.headers as Record<string, string>)?.Authorization;
    expect(authHeader).toBeUndefined();
  });

  it('populates data on successful response', async () => {
    const profileData = {
      name: 'João Silva',
      tournaments: [
        {
          id: 't-1',
          name: 'Copa Test',
          status: 'RUNNING',
          createdAt: '2026-01-01T00:00:00Z',
          startedAt: '2026-01-02T00:00:00Z',
          finishedAt: null,
          playerCount: 8,
          championName: null,
          entryFee: null,
          prizePool: null,
        },
      ],
    };
    mockSuccess(profileData);
    const { result } = renderHook(() => usePublicProfile('joao-a7x2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(profileData);
    expect(result.current.error).toBeNull();
  });

  it('sets error message on 404', async () => {
    mockError(404);
    const { result } = renderHook(() => usePublicProfile('not-found-slug'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Perfil nao encontrado');
  });

  it('sets generic error on non-404 HTTP error', async () => {
    mockError(500);
    const { result } = renderHook(() => usePublicProfile('joao-a7x2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Erro ao carregar perfil');
  });

  it('sets graceful error on network failure', async () => {
    mockNetworkFailure();
    const { result } = renderHook(() => usePublicProfile('joao-a7x2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Erro ao carregar perfil');
  });

  it('never exposes financial data returned from API (passes through null)', async () => {
    const profileData = {
      name: 'João',
      tournaments: [
        {
          id: 't-1',
          name: 'Copa',
          status: 'RUNNING',
          createdAt: '2026-01-01T00:00:00Z',
          startedAt: null,
          finishedAt: null,
          playerCount: 4,
          championName: null,
          entryFee: null,   // server hides this when showFinancials=false
          prizePool: null,  // server hides this when showFinancials=false
        },
      ],
    };
    mockSuccess(profileData);
    const { result } = renderHook(() => usePublicProfile('joao-a7x2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data!.tournaments[0].entryFee).toBeNull();
    expect(result.current.data!.tournaments[0].prizePool).toBeNull();
  });
});

// ── usePublicTournament ───────────────────────────────────────────────────────

describe('usePublicTournament', () => {
  it('calls the correct tournament-specific endpoint', async () => {
    mockSuccess({
      tournament: { id: 't-1', name: 'Copa', status: 'RUNNING' },
      bracket: { rounds: [], totalRounds: 0, champion: null },
      statistics: {},
    });
    const { result } = renderHook(() =>
      usePublicTournament('joao-a7x2', 't-abc-123')
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test/public/organizers/joao-a7x2/tournaments/t-abc-123'
    );
  });

  it('sets 404 error message on not found', async () => {
    mockError(404);
    const { result } = renderHook(() =>
      usePublicTournament('joao-a7x2', 'no-such-id')
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Torneio nao encontrado');
  });

  it('handles network failure gracefully', async () => {
    mockNetworkFailure();
    const { result } = renderHook(() =>
      usePublicTournament('joao-a7x2', 't-1')
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Erro ao carregar torneio');
  });
});
