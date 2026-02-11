import type { BracketData } from '../types.ts';
import { Bracket } from '../components/Bracket.tsx';
import { WaitingState } from '../components/WaitingState.tsx';
import { ChampionBanner } from '../components/ChampionBanner.tsx';

interface TvLayoutProps {
  data: BracketData;
}

export function TvLayout({ data }: TvLayoutProps) {
  const { tournament, rounds, totalRounds, champion } = data;
  const isWaiting =
    tournament.status === 'DRAFT' || tournament.status === 'OPEN';
  const isFinished = tournament.status === 'FINISHED';

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          {tournament.name}
        </h1>
        {isFinished && champion && <ChampionBanner champion={champion} />}
      </header>

      {isWaiting ? (
        <WaitingState
          tournamentName={tournament.name}
          status={tournament.status as 'DRAFT' | 'OPEN'}
        />
      ) : (
        <Bracket rounds={rounds} totalRounds={totalRounds} />
      )}
    </div>
  );
}
