import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './features/landing/LandingPage.tsx';
import { LoginPage } from './features/auth/LoginPage.tsx';
import { RegisterPage } from './features/auth/RegisterPage.tsx';
import { ProtectedRoute } from './features/auth/ProtectedRoute.tsx';
import { AppGate } from './features/app/AppGate.tsx';
import { OnboardingPage } from './features/onboarding/OnboardingPage.tsx';
import { TournamentPublicView } from './features/tv/TournamentPublicView.tsx';

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/tournament/:tournamentId/tv"
        element={<TournamentPublicView mode="tv" />}
      />
      <Route
        path="/tournament/:tournamentId/mobile"
        element={<TournamentPublicView mode="mobile" />}
      />

      {/* Protected routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppGate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
