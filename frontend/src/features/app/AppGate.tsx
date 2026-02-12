import { Navigate } from 'react-router-dom';
import { useTournaments } from '../tournaments/useTournaments.ts';
import { TournamentsPage } from '../tournaments/TournamentsPage.tsx';

export function AppGate() {
  const { data: tournaments, isLoading, error } = useTournaments();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white text-lg">Carregando...</p>
      </div>
    );
  }

  if (!error && tournaments.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <TournamentsPage />;
}
