import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Unit tests run in Node by default. A test that renders React opts into the
 * browser-like environment with a `// @vitest-environment jsdom` docblock.
 * Playwright specs (e2e/) are not Vitest's.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // `server-only` throws outside a React Server environment; tests import
      // server modules directly.
      'server-only': path.resolve(import.meta.dirname, 'test/empty.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    setupFiles: ['./test/setup.ts'],
    // jsdom renders run past 5 s on a machine shared by parallel checks.
    // Time limits a test means are its own assertions; this only catches a
    // hang (as in apps/api).
    testTimeout: 30_000,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
