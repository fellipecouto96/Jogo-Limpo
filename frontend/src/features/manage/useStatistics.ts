import { useState, useEffect, useCallback } from 'react';
import { apiFetch, buildHttpResponseError } from '../../shared/api.ts';
import type { TournamentStatistics } from '../tv/types.ts';
import {
  formatGuidedSystemError,
  resolveGuidedSystemError,
} from '../../shared/systemErrors.ts';

interface UseStatisticsReturn {
  data: TournamentStatistics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStatistics(tournamentId: string): UseStatisticsReturn {
  const [data, setData] = useState<TournamentStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/tournaments/${tournamentId}/statistics`);
      if (!res.ok) {
        throw await buildHttpResponseError(res);
      }
      const stats = await res.json();
      setData(stats);
    } catch (err) {
      setError(
        formatGuidedSystemError(
          resolveGuidedSystemError({ error: err })
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void fetchStatistics();
  }, [fetchStatistics]);

  return { data, isLoading, error, refetch: fetchStatistics };
}
