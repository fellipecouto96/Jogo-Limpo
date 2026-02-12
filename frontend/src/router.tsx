import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './features/landing/LandingPage.tsx';
import { AppGate } from './features/app/AppGate.tsx';
import { OnboardingPage } from './features/onboarding/OnboardingPage.tsx';
import { TournamentPublicView } from './features/tv/TournamentPublicView.tsx';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AppGate />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
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
