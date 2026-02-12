import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../shared/api.ts';

interface DashboardMetrics {
  totalTournaments: number;
  totalPlayers: number;
  totalPrizeDistributed: number;
}

interface ActiveTournament {
  id: string;
  name: string;
  status: string;
  playerCount: number;
  createdAt: string;
  startedAt: string | null;
}

interface FinishedTournament {
  id: string;
  name: string;
  champion: { id: string; name: string } | null;
  runnerUp: { id: string; name: string } | null;
  playerCount: number;
  prizePool: number | null;
  finishedAt: string | null;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  activeTournaments: ActiveTournament[];
  finishedTournaments: FinishedTournament[];
}

interface UseDashboardResult {
  data: DashboardData | null;
  error: string | null;
  isLoading: boolean;
}

const emptyData: DashboardData = {
  metrics: { totalTournaments: 0, totalPlayers: 0, totalPrizeDistributed: 0 },
  activeTournaments: [],
  finishedTournaments: [],
};

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiFetch('/dashboard-summary');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json: DashboardData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setData(emptyData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, error, isLoading };
}
