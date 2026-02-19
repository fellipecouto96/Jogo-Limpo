import { useState, useEffect, useCallback } from 'react';
import { apiFetch, buildHttpResponseError } from '../../shared/api.ts';
import {
  formatGuidedSystemError,
  resolveGuidedSystemError,
} from '../../shared/systemErrors.ts';
import { logClientPerformance } from '../../shared/logger.ts';

interface DashboardMetrics {
  totalCollectedThisMonth: number;
  totalPrizePaid: number;
}

interface DashboardTournament {
  id: string;
  name: string;
  status: string;
  playerCount: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  tournaments: DashboardTournament[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

interface UseDashboardResult {
  data: DashboardData | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const emptyData: DashboardData = {
  metrics: { totalCollectedThisMonth: 0, totalPrizePaid: 0 },
  tournaments: [],
  pagination: { page: 1, limit: 8, total: 0, hasMore: false },
};

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    const startedAt = performance.now();
    try {
      const res = await apiFetch('/dashboard-summary?page=1&limit=8');
      if (!res.ok) {
        throw await buildHttpResponseError(res);
      }
      const json: DashboardData = await res.json();
      setData(json);
      setError(null);
      const durationMs = performance.now() - startedAt;
      logClientPerformance('dashboard_perf', 'dashboard_load_ms', {
        durationMs: Number(durationMs.toFixed(2)),
        tournaments: json.tournaments.length,
      });
    } catch (err) {
      setError(
        formatGuidedSystemError(
          resolveGuidedSystemError({ error: err })
        )
      );
      setData(emptyData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, error, isLoading, refetch: fetchDashboard };
}
