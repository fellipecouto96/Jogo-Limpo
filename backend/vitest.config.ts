import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: [
        'src/modules/**/financials.ts',
        'src/shared/utils/prng.ts',
        'src/utils/slug.ts',
        'src/modules/public-profile/public-profile.service.ts',
        'src/modules/settings/settings.service.ts',
      ],
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});
