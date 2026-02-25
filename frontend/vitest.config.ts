import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        // Shared utilities and tested hooks
        'src/shared/qrcode.ts',
        'src/shared/useOnboarding.ts',
        'src/shared/OnboardingToast.tsx',
        'src/shared/OnboardingHint.tsx',
        'src/shared/GuidedErrorCard.tsx',
        // Manage feature
        'src/features/manage/podium.ts',
        'src/features/manage/components/InteractiveMatchCard.tsx',
        'src/features/manage/TournamentHistoryPage.tsx',
        // TV components (repechage-critical, recently modified)
        'src/features/tv/components/MatchCard.tsx',
        'src/features/tv/components/BracketRound.tsx',
        'src/features/tv/components/MobileRound.tsx',
        // Public profile feature
        'src/features/public-profile/usePublicProfile.ts',
      ],
      exclude: ['src/test/**', '**/*.test.*', '**/types.ts'],
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
