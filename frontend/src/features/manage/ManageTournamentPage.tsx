import { Link, useParams } from 'react-router-dom';
import { useManageBracket } from './useManageBracket.ts';
import { ManageBracketRound } from './components/ManageBracketRound.tsx';
import { StatusBadge } from '../tournaments/components/StatusBadge.tsx';
import { ChampionBanner } from '../tv/components/ChampionBanner.tsx';

export function ManageTournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { data, error, isLoading, refetch } = useManageBracket(
    tournamentId!
  );

  if (isLoading) {
    return (
      <p className="text-gray-500 text-sm py-12 text-center">
        Carregando...
      </p>
    );
  }

  if (error && !data) {
    return (
      <p className="text-red-400 text-center py-12">{error}</p>
    );
  }

  if (!data) return null;

  const { tournament, rounds, totalRounds, champion } = data;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl text-white">
            {tournament.name}
          </h1>
          <StatusBadge status={tournament.status} />
        </div>
        <div className="flex gap-2">
          <Link
            to={`/tournament/${tournamentId}/tv`}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            TV Mode
          </Link>
          <Link
            to={`/tournament/${tournamentId}/mobile`}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            Mobile
          </Link>
          <Link
            to={`/app/tournament/${tournamentId}/settings`}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            Financeiro
          </Link>
          {tournament.status === 'FINISHED' && (
            <Link
              to={`/app/tournament/${tournamentId}/history`}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors"
            >
              Historico
            </Link>
          )}
        </div>
      </div>

      {/* Champion banner */}
      {tournament.status === 'FINISHED' && champion && (
        <div className="mb-6">
          <ChampionBanner champion={champion} />
        </div>
      )}

      {/* Bracket */}
      {totalRounds > 0 && (
        <div
          className="grid gap-4 items-center w-full overflow-x-auto pb-4"
          style={{
            gridTemplateColumns: `repeat(${totalRounds}, minmax(220px, 1fr))`,
          }}
        >
          {rounds.map((round) => (
            <ManageBracketRound
              key={round.id}
              round={round}
              totalRounds={totalRounds}
              isLastRound={round.roundNumber === totalRounds}
              tournamentId={tournamentId!}
              tournamentStatus={tournament.status}
              onResultRecorded={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
