import { useState, useCallback } from 'react';
import { apiFetch, buildHttpResponseError } from '../../shared/api.ts';
import type { TournamentDetail } from './useTournamentDetails.ts';
import {
  formatGuidedSystemError,
  resolveGuidedSystemError,
} from '../../shared/systemErrors.ts';

export interface FinancialsPayload {
  entryFee: number;
  organizerPercentage: number;
  championPercentage?: number;
  runnerUpPercentage?: number;
  thirdPlacePercentage?: number | null;
  fourthPlacePercentage?: number | null;
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
          throw await buildHttpResponseError(res);
        }
        return await res.json();
      } catch (err) {
        setError(
          formatGuidedSystemError(
            resolveGuidedSystemError({
              error: err,
              context: 'prize',
            })
          )
        );
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return { updateFinancials, isSubmitting, error };
}
