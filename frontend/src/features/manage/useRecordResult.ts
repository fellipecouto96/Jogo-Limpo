import { useState, useCallback } from 'react';
import { apiFetch } from '../../shared/api.ts';

interface RecordResultResponse {
  matchId: string;
  winnerId: string;
  player1Score: number | null;
  player2Score: number | null;
  roundComplete: boolean;
  tournamentFinished: boolean;
}

interface UpdateScoreResponse {
  matchId: string;
  player1Score: number;
  player2Score: number;
}

interface UseRecordResultReturn {
  recordResult: (
    tournamentId: string,
    matchId: string,
    winnerId: string,
    player1Score?: number,
    player2Score?: number
  ) => Promise<RecordResultResponse>;
  updateScore: (
    tournamentId: string,
    matchId: string,
    player1Score: number,
    player2Score: number
  ) => Promise<UpdateScoreResponse>;
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
      winnerId: string,
      player1Score?: number,
      player2Score?: number
    ): Promise<RecordResultResponse> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const body: Record<string, unknown> = { winnerId };
        if (player1Score !== undefined && player2Score !== undefined) {
          body.player1Score = player1Score;
          body.player2Score = player2Score;
        }

        const res = await apiFetch(
          `/tournaments/${tournamentId}/matches/${matchId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? `HTTP ${res.status}`
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

  const updateScore = useCallback(
    async (
      tournamentId: string,
      matchId: string,
      player1Score: number,
      player2Score: number
    ): Promise<UpdateScoreResponse> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await apiFetch(
          `/tournaments/${tournamentId}/matches/${matchId}/score`,
          {
            method: 'PATCH',
            body: JSON.stringify({ player1Score, player2Score }),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? `HTTP ${res.status}`
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

  return { recordResult, updateScore, isSubmitting, error };
}
