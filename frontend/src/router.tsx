import { Routes, Route, Navigate } from 'react-router-dom';
import { TournamentsPage } from './features/tournaments/TournamentsPage.tsx';
import { TournamentPublicView } from './features/tv/TournamentPublicView.tsx';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tournaments" replace />} />
      <Route path="/tournaments" element={<TournamentsPage />} />
      <Route
        path="/tournament/:tournamentId/tv"
        element={<TournamentPublicView mode="tv" />}
      />
      <Route
        path="/tournament/:tournamentId/mobile"
        element={<TournamentPublicView mode="mobile" />}
      />
    </Routes>
  );
}
