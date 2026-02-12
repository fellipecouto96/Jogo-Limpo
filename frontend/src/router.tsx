import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './features/landing/LandingPage.tsx';
import { LoginPage } from './features/auth/LoginPage.tsx';
import { RegisterPage } from './features/auth/RegisterPage.tsx';
import { ProtectedRoute } from './features/auth/ProtectedRoute.tsx';
import { AppLayout } from './features/app/AppLayout.tsx';
import { DashboardPage } from './features/app/DashboardPage.tsx';
import { SettingsPage } from './features/app/SettingsPage.tsx';
import { TournamentsPage } from './features/tournaments/TournamentsPage.tsx';
import { OnboardingPage } from './features/onboarding/OnboardingPage.tsx';
import { TournamentPublicView } from './features/tv/TournamentPublicView.tsx';
import { ManageTournamentPage } from './features/manage/ManageTournamentPage.tsx';
import { TournamentSettingsPage } from './features/manage/TournamentSettingsPage.tsx';
import { TournamentHistoryPage } from './features/manage/TournamentHistoryPage.tsx';

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

      {/* Protected app shell */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="tournaments" element={<TournamentsPage />} />
        <Route path="new" element={<OnboardingPage />} />
        <Route path="tournament/:tournamentId" element={<ManageTournamentPage />} />
        <Route path="tournament/:tournamentId/settings" element={<TournamentSettingsPage />} />
        <Route path="tournament/:tournamentId/history" element={<TournamentHistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
