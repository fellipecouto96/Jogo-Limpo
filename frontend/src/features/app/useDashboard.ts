import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../shared/api.ts';

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
}

interface UseDashboardResult {
  data: DashboardData | null;
  error: string | null;
  isLoading: boolean;
}

const emptyData: DashboardData = {
  metrics: { totalCollectedThisMonth: 0, totalPrizePaid: 0 },
  tournaments: [],
};

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiFetch('/dashboard-summary');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const backendMessage =
          (body as { error?: string }).error ??
          `Não foi possível carregar o painel agora. (HTTP ${res.status})`;
        throw new Error(backendMessage);
      }
      const json: DashboardData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(
        message.startsWith('HTTP')
          ? 'Não foi possível atualizar os indicadores agora.'
          : message
      );
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
