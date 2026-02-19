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
import { renderHook, waitFor } from '@testing-library/react';
import { usePublicProfile, usePublicTournament } from '../usePublicProfile.ts';

// Mock getApiUrl to return predictable URLs
vi.mock('../../../shared/api.ts', () => ({
  getApiUrl: (path: string) => `https://api.test${path}`,
  buildHttpResponseError: async (res: { status: number }) => ({
    name: 'HttpResponseError',
    status: res.status,
    backendError: null,
    message: `Falha na requisicao (${res.status})`,
  }),
  normalizeApiError: (error: { status?: number; backendError?: string; message?: string }) => ({
    status: error?.status ?? null,
    backendError: error?.backendError ?? null,
    message: error?.message ?? '',
    isNetwork:
      typeof error?.message === 'string' &&
      error.message.toLowerCase().includes('network'),
  }),
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
    mockSuccess({
      name: 'João',
      tournaments: [],
      pagination: { page: 1, limit: 8, total: 0, hasMore: false },
    });
    const { result } = renderHook(() => usePublicProfile('joao-a7x2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test/public/organizers/joao-a7x2?page=1&limit=8'
    );
  });

  it('does NOT include Authorization header (public endpoint)', async () => {
    mockSuccess({
      name: 'João',
      tournaments: [],
      pagination: { page: 1, limit: 8, total: 0, hasMore: false },
    });
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
          publicSlug: 'copa-test-a7x2',
          name: 'Copa Test',
          status: 'RUNNING',
          createdAt: '2026-01-01T00:00:00Z',
          startedAt: '2026-01-02T00:00:00Z',
          finishedAt: null,
          playerCount: 8,
          championName: null,
        },
      ],
      pagination: { page: 1, limit: 8, total: 1, hasMore: false },
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
    expect(result.current.error?.what).toBe('Link invalido ou torneio nao encontrado.');
  });

  it('sets generic error on non-404 HTTP error', async () => {
    mockError(500);
    const { result } = renderHook(() => usePublicProfile('joao-a7x2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error?.what).toBe('Nao foi possivel concluir agora.');
  });

  it('sets graceful error on network failure', async () => {
    mockNetworkFailure();
    const { result } = renderHook(() => usePublicProfile('joao-a7x2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error?.what).toBe('Nao foi possivel concluir agora.');
  });

  it('keeps public tournament payload without financial fields', async () => {
    const profileData = {
      name: 'João',
      tournaments: [
        {
          publicSlug: 'copa-a7x2',
          name: 'Copa',
          status: 'RUNNING',
          createdAt: '2026-01-01T00:00:00Z',
          startedAt: null,
          finishedAt: null,
          playerCount: 4,
          championName: null,
        },
      ],
      pagination: { page: 1, limit: 8, total: 1, hasMore: false },
    };
    mockSuccess(profileData);
    const { result } = renderHook(() => usePublicProfile('joao-a7x2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data!.tournaments[0].publicSlug).toBe('copa-a7x2');
    expect(
      (result.current.data!.tournaments[0] as unknown as Record<string, unknown>).entryFee
    ).toBeUndefined();
  });
});

// ── usePublicTournament ───────────────────────────────────────────────────────

describe('usePublicTournament', () => {
  it('calls the new slug-based tournament endpoint', async () => {
    mockSuccess({
      tournament: {
        publicSlug: 'copa-abc-123',
        name: 'Copa',
        status: 'RUNNING',
        createdAt: '2026-02-10T00:00:00Z',
        startedAt: null,
        finishedAt: null,
        playerCount: 8,
        championName: null,
      },
      bracket: { rounds: [], totalRounds: 0, champion: null },
      statistics: {},
    });
    const { result } = renderHook(() => usePublicTournament('copa-abc-123'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test/public/tournaments/copa-abc-123'
    );
  });

  it('sets 404 error message on not found', async () => {
    mockError(404);
    const { result } = renderHook(() => usePublicTournament('no-such-slug'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.what).toBe('Link invalido ou torneio nao encontrado.');
  });

  it('handles network failure gracefully', async () => {
    mockNetworkFailure();
    const { result } = renderHook(() => usePublicTournament('copa-abc-123'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.what).toBe('Nao foi possivel concluir agora.');
  });
});
