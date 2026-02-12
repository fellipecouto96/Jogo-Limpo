import { Link } from 'react-router-dom';
import type { TournamentListItem } from '../types.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface TournamentCardProps {
  tournament: TournamentListItem;
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const hasStarted =
    tournament.status === 'RUNNING' || tournament.status === 'FINISHED';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-white leading-tight">
          {tournament.name}
        </h3>
        <StatusBadge status={tournament.status} />
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-400 mb-5">
        <span>{tournament.organizer.name}</span>
        {tournament.playerCount > 0 && (
          <>
            <span className="text-gray-600" aria-hidden="true">
              &middot;
            </span>
            <span>{tournament.playerCount} jogadores</span>
          </>
        )}
      </div>

      {hasStarted ? (
        <div className="flex gap-2">
          {tournament.status === 'RUNNING' && (
            <Link
              to={`/app/tournament/${tournament.id}`}
              className="flex-1 text-center text-sm font-semibold py-2.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors"
            >
              Gerenciar
            </Link>
          )}
          <Link
            to={`/tournament/${tournament.id}/tv`}
            className="flex-1 text-center text-sm font-semibold py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            TV Mode
          </Link>
          <Link
            to={`/tournament/${tournament.id}/mobile`}
            className="flex-1 text-center text-sm font-semibold py-2.5 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            Mobile
          </Link>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-2.5">
          Aguardando inicio do torneio
        </p>
      )}
    </div>
  );
}
