import { useState, useEffect, useCallback } from 'react';
import type { TournamentListItem, TournamentListResponse } from './types.ts';
import { apiFetch, buildHttpResponseError } from '../../shared/api.ts';
import {
  formatGuidedSystemError,
  resolveGuidedSystemError,
} from '../../shared/systemErrors.ts';
import { logClientPerformance } from '../../shared/logger.ts';

interface UseTournamentsResult {
  data: TournamentListItem[];
  error: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  total: number;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useTournaments(): UseTournamentsResult {
  const [data, setData] = useState<TournamentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 12;

  const fetchPage = useCallback(async (nextPage: number, append: boolean) => {
    const startedAt = performance.now();
    try {
      const res = await apiFetch(`/tournaments?page=${nextPage}&limit=${limit}`);
      if (!res.ok) {
        throw await buildHttpResponseError(res);
      }
      const json: TournamentListResponse = await res.json();
      setData((previous) =>
        append ? [...previous, ...json.items] : json.items
      );
      setPage(json.page);
      setTotal(json.total);
      setHasMore(json.hasMore);
      const durationMs = performance.now() - startedAt;
      logClientPerformance('dashboard_perf', 'tournaments_page_load_ms', {
        durationMs: Number(durationMs.toFixed(2)),
        page: nextPage,
        append,
        count: json.items.length,
      });
      setError(null);
    } catch (err) {
      setError(
        formatGuidedSystemError(
          resolveGuidedSystemError({ error: err })
        )
      );
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchTournaments = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingMore(false);
    await fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    await fetchPage(page + 1, true);
  }, [fetchPage, hasMore, isLoadingMore, page]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return {
    data,
    error,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    refetch: fetchTournaments,
    loadMore,
  };
}
