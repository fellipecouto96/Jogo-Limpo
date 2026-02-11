import { Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { TournamentPublicView } from './features/tv/TournamentPublicView.tsx';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route
        path="/tv/:tournamentId"
        element={<TournamentPublicView mode="tv" />}
      />
      <Route
        path="/m/:tournamentId"
        element={<TournamentPublicView mode="mobile" />}
      />
    </Routes>
  );
}
