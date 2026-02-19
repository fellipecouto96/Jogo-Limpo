import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../../shared/api.ts';

interface PublicTournament {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  playerCount: number;
  championName: string | null;
  entryFee: number | null;
  prizePool: number | null;
}

interface PublicProfile {
  name: string;
  tournaments: PublicTournament[];
}

interface PublicTournamentDetail {
  tournament: {
    id: string;
    name: string;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
    playerCount: number;
    championName: string | null;
    entryFee: number | null;
    prizePool: number | null;
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

export function usePublicProfile(slug: string) {
  const [data, setData] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl(`/public/organizers/${slug}`));
      if (!res.ok) {
        setError(res.status === 404 ? 'Perfil nao encontrado' : 'Erro ao carregar perfil');
        return;
      }
      setData(await res.json());
    } catch {
      setError('Erro ao carregar perfil');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { data, error, isLoading };
}

export function usePublicTournament(slug: string, tournamentId: string) {
  const [data, setData] = useState<PublicTournamentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(
        getApiUrl(`/public/organizers/${slug}/tournaments/${tournamentId}`)
      );
      if (!res.ok) {
        setError(res.status === 404 ? 'Torneio nao encontrado' : 'Erro ao carregar torneio');
        return;
      }
      setData(await res.json());
    } catch {
      setError('Erro ao carregar torneio');
    } finally {
      setIsLoading(false);
    }
  }, [slug, tournamentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, error, isLoading };
}
