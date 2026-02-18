import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.ts';
import { Sidebar } from './Sidebar.tsx';
import { OnboardingToast } from '../../shared/OnboardingToast.tsx';

export function AppLayout() {
  const { organizer } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-8 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Abrir menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Spacer on desktop (no hamburger) */}
          <div className="hidden lg:block" />

          {/* Organizer name */}
          <span className="text-sm text-gray-400">{organizer?.name}</span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
          <OnboardingToast />
        </main>
      </div>
    </div>
  );
}
