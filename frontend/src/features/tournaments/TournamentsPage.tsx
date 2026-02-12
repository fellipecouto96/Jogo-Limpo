import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';
import { useTournaments } from './useTournaments.ts';
import { TournamentCard } from './components/TournamentCard.tsx';
import { EmptyState } from './components/EmptyState.tsx';

export function TournamentsPage() {
  const { data: tournaments, error, isLoading } = useTournaments();
  const { organizer, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Jogo Limpo
            </h1>
            <p className="text-sm text-gray-400 mt-1">Torneios</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{organizer?.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
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
      </main>
    </div>
  );
}
