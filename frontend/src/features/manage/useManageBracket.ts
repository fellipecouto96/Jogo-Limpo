import { useState, useEffect, useCallback, useRef } from 'react';
import type { BracketData } from '../tv/types.ts';
import { apiFetch, buildHttpResponseError } from '../../shared/api.ts';
import {
  formatGuidedSystemError,
  resolveGuidedSystemError,
} from '../../shared/systemErrors.ts';

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
        throw await buildHttpResponseError(res);
      }
      const json: BracketData = await res.json();
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
