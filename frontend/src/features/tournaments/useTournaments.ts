import { useState, useEffect, useCallback } from 'react';
import type { TournamentListItem } from './types.ts';
import { apiFetch } from '../../shared/api.ts';

interface UseTournamentsResult {
  data: TournamentListItem[];
  error: string | null;
  isLoading: boolean;
}

export function useTournaments(): UseTournamentsResult {
  const [data, setData] = useState<TournamentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await apiFetch('/tournaments');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json: TournamentListItem[] = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return { data, error, isLoading };
}
