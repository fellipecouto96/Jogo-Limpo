import { useState, useEffect, useCallback } from 'react';
import { apiFetch, buildHttpResponseError } from '../../shared/api.ts';
import {
  formatGuidedSystemError,
  resolveGuidedSystemError,
} from '../../shared/systemErrors.ts';

export interface TournamentDetail {
  id: string;
  publicSlug: string;
  name: string;
  status: string;
  playerCount: number;
  organizerName: string;
  drawSeed: string | null;
  entryFee: number | null;
  organizerPercentage: number | null;
  championPercentage: number | null;
  runnerUpPercentage: number | null;
  thirdPlacePercentage: number | null;
  fourthPlacePercentage: number | null;
  firstPlacePercentage: number | null;
  secondPlacePercentage: number | null;
  calculatedPrizePool: number | null;
  calculatedOrganizerAmount: number | null;
  prizePool: number | null;
  totalCollected: number | null;
  organizerAmount: number | null;
  championPrize: number | null;
  runnerUpPrize: number | null;
  thirdPlacePrize: number | null;
  fourthPlacePrize: number | null;
  firstPlacePrize: number | null;
  secondPlacePrize: number | null;
  champion: { id: string; name: string } | null;
  runnerUp: { id: string; name: string } | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  allowLateEntry: boolean;
  allowLateEntryUntilRound: number;
  lateEntryFee: number | null;
  allowRebuy: boolean;
  allowRebuyUntilRound: number;
  rebuyFee: number | null;
}

interface UseTournamentDetailsResult {
  data: TournamentDetail | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useTournamentDetails(
  tournamentId: string
): UseTournamentDetailsResult {
  const [data, setData] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTournament = useCallback(async () => {
    try {
      const res = await apiFetch(`/tournaments/${tournamentId}`);
      if (!res.ok) {
        throw await buildHttpResponseError(res);
      }
      const json: TournamentDetail = await res.json();
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
    fetchTournament();
  }, [fetchTournament]);

  return { data, error, isLoading, refetch: fetchTournament };
}
