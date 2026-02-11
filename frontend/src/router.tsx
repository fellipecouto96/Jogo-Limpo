import { Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { TvPage } from './features/tv/TvPage.tsx';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/tv/:tournamentId" element={<TvPage />} />
    </Routes>
  );
}
