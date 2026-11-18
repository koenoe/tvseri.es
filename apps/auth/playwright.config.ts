import { defineConfig, devices } from '@playwright/test';

// A port from tools/agents' range for everything else (3190–3199)
const port = Number(process.env.AUTH_E2E_PORT ?? 3193);

/**
 * The sign-in pages end to end, on the local harness (e2e/harness): the real
 * issuer and pages with a mailbox instead of SES and a stand-in Google.
 * Run with `pnpm agents:heavy -- pnpm --filter @tvseri.es/auth e2e`.
 */
export default defineConfig({
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { height: 900, width: 1440 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { height: 900, width: 1440 },
      },
    },
    {
      name: 'phone',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'webkit',
        viewport: { height: 797, width: 390 },
      },
    },
  ],
  reporter: [['list']],
  testDir: 'e2e',
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  webServer: {
    command: 'node e2e/harness/serve.ts',
    env: { AUTH_E2E_PORT: String(port) },
    reuseExistingServer: false,
    url: `http://localhost:${port}/start`,
  },
  workers: 2,
});
