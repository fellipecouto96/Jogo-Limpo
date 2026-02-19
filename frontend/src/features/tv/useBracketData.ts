import { useState, useEffect, useCallback, useRef } from 'react';
import type { BracketData } from './types.ts';
import { buildHttpResponseError } from '../../shared/api.ts';
import {
  formatGuidedSystemError,
  resolveGuidedSystemError,
} from '../../shared/systemErrors.ts';
import { logClientPerformance } from '../../shared/logger.ts';

const POLL_INTERVAL = 15_000;
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

interface UseBracketDataResult {
  data: BracketData | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useBracketData(tournamentId: string): UseBracketDataResult {
  const [data, setData] = useState<BracketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBracket = useCallback(async () => {
    const startedAt = performance.now();
    try {
      const res = await fetch(
        `${API_BASE}/tournaments/${tournamentId}/bracket`
      );
      if (!res.ok) {
        throw await buildHttpResponseError(res);
      }
      const json: BracketData = await res.json();
      setData(json);
      const durationMs = performance.now() - startedAt;
      logClientPerformance('bracket_perf', 'bracket_load_ms', {
        tournamentId,
        durationMs: Number(durationMs.toFixed(2)),
        rounds: json.rounds.length,
      });
      setError(null);
    } catch (err) {
      setError(
        formatGuidedSystemError(
          resolveGuidedSystemError({
            error: err,
            context: 'public_link',
          })
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
