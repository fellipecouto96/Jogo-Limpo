import { useState, useEffect, useCallback } from 'react';
import {
  buildHttpResponseError,
  getApiUrl,
  normalizeApiError,
} from '../../shared/api.ts';
import { logClientError, logClientPerformance } from '../../shared/logger.ts';
import {
  type GuidedSystemError,
  resolveGuidedSystemError,
} from '../../shared/systemErrors.ts';

interface PublicTournament {
  publicSlug: string;
  name: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  playerCount: number;
  championName: string | null;
}

interface PublicProfile {
  name: string;
  tournaments: PublicTournament[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

interface PublicTournamentDetail {
  tournament: {
    publicSlug: string;
    name: string;
    status: string;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    playerCount: number;
    championName: string | null;
  };
  bracket: {
    tournament: { id: string; name: string; status: string; startedAt: string | null; finishedAt: string | null };
    totalRounds: number;
    rounds: {
      id: string;
      roundNumber: number;
      label: string;
      matches: {
        id: string;
        positionInBracket: number;
        player1: { id: string; name: string };
        player2: { id: string; name: string } | null;
        winner: { id: string; name: string } | null;
        player1Score: number | null;
        player2Score: number | null;
        isBye: boolean;
        finishedAt: string | null;
      }[];
    }[];
    champion: { id: string; name: string } | null;
  };
  statistics: {
    totalMatches: number;
    completedMatches: number;
    totalGames: number;
    highestScoringPlayer: { id: string; name: string; totalScore: number } | null;
    biggestWinMargin: { matchId: string; margin: number; winner: string; loser: string } | null;
    averageScorePerMatch: number;
    finalScore: { player1: string; player2: string; score1: number; score2: number } | null;
    playerCount: number;
  };
}

interface UsePublicProfileOptions {
  status?: 'RUNNING' | 'FINISHED';
  enabled?: boolean;
  limit?: number;
}

export function usePublicProfile(
  slug: string,
  options: UsePublicProfileOptions = {}
) {
  const { status, enabled = true, limit = 8 } = options;
  const [data, setData] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<GuidedSystemError | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchProfile = useCallback(async (page = 1, append = false) => {
    if (!enabled) return;
    const startedAt = performance.now();

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) {
        query.set('status', status);
      }

      const res = await fetch(
        getApiUrl(`/public/organizers/${slug}?${query.toString()}`)
      );
      if (!res.ok) {
        throw await buildHttpResponseError(res);
      }
      const json: PublicProfile = await res.json();
      setData((previous) =>
        append && previous
          ? {
              ...json,
              tournaments: [...previous.tournaments, ...json.tournaments],
            }
          : json
      );
      const durationMs = performance.now() - startedAt;
      logClientPerformance('public_page_perf', 'public_profile_load_ms', {
        durationMs: Number(durationMs.toFixed(2)),
        slug,
        status: status ?? 'ALL',
        page,
        count: json.tournaments.length,
      });
      setError(null);
    } catch (error) {
      logClientError('public_page', 'Failed to load public profile', { slug });
      const normalized = normalizeApiError(error);
      setError(
        resolveGuidedSystemError({
          error,
          context: normalized.status === 404 ? 'public_link' : 'default',
        })
      );
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [enabled, limit, slug, status]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void fetchProfile(1, false);
  }, [enabled, fetchProfile]);

  const loadMore = useCallback(async () => {
    if (!data?.pagination.hasMore || isLoadingMore) return;
    await fetchProfile(data.pagination.page + 1, true);
  }, [data?.pagination.hasMore, data?.pagination.page, fetchProfile, isLoadingMore]);

  return {
    data,
    error,
    isLoading,
    isLoadingMore,
    hasMore: data?.pagination.hasMore ?? false,
    refetch: () => fetchProfile(1, false),
    loadMore,
  };
}

export function usePublicTournament(tournamentSlug: string) {
  const [data, setData] = useState<PublicTournamentDetail | null>(null);
  const [error, setError] = useState<GuidedSystemError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    const startedAt = performance.now();
    try {
      const res = await fetch(getApiUrl(`/public/tournaments/${tournamentSlug}`));
      if (!res.ok) {
        throw await buildHttpResponseError(res);
      }
      const json: PublicTournamentDetail = await res.json();
      setData(json);
      const durationMs = performance.now() - startedAt;
      logClientPerformance('public_page_perf', 'public_tournament_load_ms', {
        durationMs: Number(durationMs.toFixed(2)),
        slug: tournamentSlug,
      });
      setError(null);
    } catch (error) {
      logClientError('public_page', 'Failed to load tournament detail', { tournamentSlug });
      const normalized = normalizeApiError(error);
      setError(
        resolveGuidedSystemError({
          error,
          context: normalized.status === 404 ? 'public_link' : 'default',
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, [tournamentSlug]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, error, isLoading, refetch: fetchDetail };
}
