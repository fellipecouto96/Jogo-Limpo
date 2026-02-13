import { useState, useCallback } from 'react';
import { apiFetch } from '../../shared/api.ts';
import type { TournamentDetail } from './useTournamentDetails.ts';

export interface FinancialsPayload {
  entryFee: number;
  organizerPercentage: number;
  championPercentage?: number;
  runnerUpPercentage?: number;
  thirdPlacePercentage?: number | null;
  firstPlacePercentage?: number;
  secondPlacePercentage?: number;
}

interface UseUpdateFinancialsReturn {
  updateFinancials: (
    tournamentId: string,
    data: FinancialsPayload
  ) => Promise<TournamentDetail>;
  isSubmitting: boolean;
  error: string | null;
}

export function useUpdateFinancials(): UseUpdateFinancialsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFinancials = useCallback(
    async (
      tournamentId: string,
      data: FinancialsPayload
    ): Promise<TournamentDetail> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await apiFetch(
          `/tournaments/${tournamentId}/financials`,
          {
            method: 'PATCH',
            body: JSON.stringify(data),
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

  return { updateFinancials, isSubmitting, error };
}
