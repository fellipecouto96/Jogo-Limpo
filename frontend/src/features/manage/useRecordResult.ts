import { useState, useCallback } from 'react';
import { apiFetch } from '../../shared/api.ts';

interface RecordResultResponse {
  matchId: string;
  winnerId: string;
  roundComplete: boolean;
  tournamentFinished: boolean;
}

interface UseRecordResultReturn {
  recordResult: (
    tournamentId: string,
    matchId: string,
    winnerId: string
  ) => Promise<RecordResultResponse>;
  isSubmitting: boolean;
  error: string | null;
}

export function useRecordResult(): UseRecordResultReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordResult = useCallback(
    async (
      tournamentId: string,
      matchId: string,
      winnerId: string
    ): Promise<RecordResultResponse> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await apiFetch(
          `/tournaments/${tournamentId}/matches/${matchId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ winnerId }),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ?? `HTTP ${res.status}`
          );
        }
        return await res.json();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Erro desconhecido';
        setError(msg);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return { recordResult, isSubmitting, error };
}
