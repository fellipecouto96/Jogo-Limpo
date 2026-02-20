import { useEffect, useMemo, useState } from 'react';
import type { BracketData, TournamentStatistics } from '../types.ts';
import { MobileRound } from '../components/MobileRound.tsx';
import { WaitingState } from '../components/WaitingState.tsx';
import { ChampionBanner } from '../components/ChampionBanner.tsx';

interface MobileLayoutProps {
  data: BracketData;
}

export function MobileLayout({ data }: MobileLayoutProps) {
  const { tournament, rounds, totalRounds, champion } = data;
  const [stats, setStats] = useState<TournamentStatistics | null>(null);
  
  const isWaiting =
    tournament.status === 'DRAFT' || tournament.status === 'OPEN';
  const isFinished = tournament.status === 'FINISHED';

  useEffect(() => {
    if (!isFinished) return;
    
    async function fetchStats() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3333' : 'https://jogo-limpo-backend.vercel.app')}/tournaments/${tournament.id}/statistics`
        );
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Silent fail - stats are optional
      }
    }
    
    void fetchStats();
  }, [tournament.id, isFinished]);

  const runnerUp = useMemo(
    () =>
      isFinished && totalRounds > 0
        ? deriveRunnerUp(rounds, totalRounds)
        : null,
    [isFinished, rounds, totalRounds]
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <header className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {tournament.name}
        </h1>
        {isFinished && champion && (
          <ChampionBanner 
            champion={champion}
            runnerUp={runnerUp}
            stats={stats}
          />
        )}
      </header>

      {isWaiting ? (
        <WaitingState
          tournamentName={tournament.name}
          status={tournament.status as 'DRAFT' | 'OPEN'}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {rounds.map((round) => (
            <MobileRound
              key={round.id}
              round={round}
              totalRounds={totalRounds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function deriveRunnerUp(rounds: BracketData['rounds'], totalRounds: number) {
  if (totalRounds === 0) return null;
  const finalRound = rounds[totalRounds - 1];
  if (!finalRound) return null;
  const finalMatch =
    finalRound.matches.find((match) => match.positionInBracket === 1) ?? null;
  if (!finalMatch) return null;
  if (!finalMatch.winner || !finalMatch.player2) return null;
  return finalMatch.winner.id === finalMatch.player1.id
    ? finalMatch.player2
    : finalMatch.player1;
}
