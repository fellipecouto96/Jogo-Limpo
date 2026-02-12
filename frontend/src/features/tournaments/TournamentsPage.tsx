import { useTournaments } from './useTournaments.ts';
import { TournamentCard } from './components/TournamentCard.tsx';
import { EmptyState } from './components/EmptyState.tsx';

export function TournamentsPage() {
  const { data: tournaments, error, isLoading } = useTournaments();

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Torneios</h1>

      {isLoading && (
        <p className="text-gray-400 text-center py-12">Carregando...</p>
      )}

      {error && (
        <p className="text-red-400 text-center py-12">{error}</p>
      )}

      {!isLoading && !error && tournaments.length === 0 && <EmptyState />}

      {!isLoading && !error && tournaments.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </div>
  );
}
