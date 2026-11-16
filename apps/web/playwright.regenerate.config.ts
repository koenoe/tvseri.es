import { defineConfig, devices } from '@playwright/test';

/**
 * Opt-in (`pnpm --filter web e2e:regenerate`, about 5 minutes): proves that a
 * page prerendered while the API was down fills in on its own. `e2e/regenerate/server.ts` builds with no API
 * reachable, then starts the stub API and `next start`; the spec waits out
 * the `unavailable` profile (revalidated after 30 s). Not part of `pnpm e2e`. See
 * instant-nav.rig.md.
 */
const port = Number(process.env.E2E_PORT ?? 3100);
const stubPort = Number(process.env.STUB_API_PORT ?? port + 1000);

export default defineConfig({
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  reporter: 'list',
  testDir: './e2e/regenerate',
  testMatch: '*.regen.ts',
  // build + the unavailable window + one regeneration
  timeout: 15 * 60_000,
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: 'node e2e/regenerate/server.ts',
    env: { E2E_PORT: String(port), STUB_API_PORT: String(stubPort) },
    // never a server left from another run: it would not be this build
    reuseExistingServer: false,
    timeout: 600_000,
    url: `http://localhost:${port}`,
  },
});
