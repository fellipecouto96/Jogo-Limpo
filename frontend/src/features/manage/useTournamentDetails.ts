import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../shared/api.ts';

export interface TournamentDetail {
  id: string;
  name: string;
  status: string;
  playerCount: number;
  organizerName: string;
  drawSeed: string | null;
  entryFee: number | null;
  organizerPercentage: number | null;
  firstPlacePercentage: number | null;
  secondPlacePercentage: number | null;
  prizePool: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
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
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${res.status}`
        );
      }
      const json: TournamentDetail = await res.json();
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
    fetchTournament();
  }, [fetchTournament]);

  return { data, error, isLoading, refetch: fetchTournament };
}
