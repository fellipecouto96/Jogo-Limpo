import { useState, useEffect, useCallback } from 'react';
import type { TournamentListItem } from './types.ts';
import { apiFetch, buildHttpResponseError } from '../../shared/api.ts';
import {
  formatGuidedSystemError,
  resolveGuidedSystemError,
} from '../../shared/systemErrors.ts';

interface UseTournamentsResult {
  data: TournamentListItem[];
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useTournaments(): UseTournamentsResult {
  const [data, setData] = useState<TournamentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await apiFetch('/tournaments');
      if (!res.ok) {
        throw await buildHttpResponseError(res);
      }
      const json: TournamentListItem[] = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(
        formatGuidedSystemError(
          resolveGuidedSystemError({ error: err })
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return { data, error, isLoading, refetch: fetchTournaments };
}
