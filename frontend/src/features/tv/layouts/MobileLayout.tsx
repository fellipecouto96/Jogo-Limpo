import type { BracketData } from '../types.ts';
import { MobileRound } from '../components/MobileRound.tsx';
import { WaitingState } from '../components/WaitingState.tsx';
import { ChampionBanner } from '../components/ChampionBanner.tsx';

interface MobileLayoutProps {
  data: BracketData;
}

export function MobileLayout({ data }: MobileLayoutProps) {
  const { tournament, rounds, totalRounds, champion } = data;
  const isWaiting =
    tournament.status === 'DRAFT' || tournament.status === 'OPEN';
  const isFinished = tournament.status === 'FINISHED';

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <header className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
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
