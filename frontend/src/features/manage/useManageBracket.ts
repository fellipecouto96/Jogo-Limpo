import { useState, useEffect, useCallback, useRef } from 'react';
import type { BracketData } from '../tv/types.ts';
import { apiFetch } from '../../shared/api.ts';

const POLL_INTERVAL = 5_000;

interface UseManageBracketResult {
  data: BracketData | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useManageBracket(
  tournamentId: string
): UseManageBracketResult {
  const [data, setData] = useState<BracketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBracket = useCallback(async () => {
    try {
      const res = await apiFetch(
        `/tournaments/${tournamentId}/bracket`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${res.status}`
        );
      }
      const json: BracketData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    setIsLoading(true);
    fetchBracket();

    intervalRef.current = setInterval(fetchBracket, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBracket]);

  return { data, error, isLoading, refetch: fetchBracket };
}
