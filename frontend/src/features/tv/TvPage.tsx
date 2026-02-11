import { useParams } from 'react-router-dom';
import { useBracketData } from './useBracketData.ts';
import { Bracket } from './components/Bracket.tsx';
import { WaitingState } from './components/WaitingState.tsx';
import { ChampionBanner } from './components/ChampionBanner.tsx';

export function TvPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { data, error, isLoading } = useBracketData(tournamentId!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white text-2xl">Carregando...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400 text-2xl">
          {error ?? 'Torneio nao encontrado'}
        </p>
      </div>
    );
  }

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
          status={tournament.status}
        />
      ) : (
        <Bracket rounds={rounds} totalRounds={totalRounds} />
      )}
    </div>
  );
}
