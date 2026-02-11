import { useState, useEffect, useCallback, useRef } from 'react';
import type { BracketData } from './types.ts';

const POLL_INTERVAL = 15_000;
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

interface UseBracketDataResult {
  data: BracketData | null;
  error: string | null;
  isLoading: boolean;
}

export function useBracketData(tournamentId: string): UseBracketDataResult {
  const [data, setData] = useState<BracketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBracket = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE}/tournaments/${tournamentId}/bracket`
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

  return { data, error, isLoading };
}
