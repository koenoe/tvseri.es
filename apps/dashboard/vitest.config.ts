import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts so tests skip the router, Tailwind and
// devtools plugins.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
