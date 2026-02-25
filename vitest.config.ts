// Root-level vitest config using the projects feature (vitest v4+).
// Each project runs with its own config and node_modules.
// Note: due to separate node_modules, the frontend project requires
// running from its directory directly for full compatibility:
//   cd backend && npx vitest run
//   cd frontend && npx vitest run
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'backend/vitest.config.ts',
      'frontend/vitest.config.ts',
    ],
  },
});
