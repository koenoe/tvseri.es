import { defineConfig, devices } from '@playwright/test';

/**
 * E2E rig (see instant-nav.rig.md): `instant()` navigation tests and redirect
 * checks run against a production build (`next build && next start`) with
 * Next's testing API compiled in. Never against `next dev`.
 *
 * Port 3100: 3000 belongs to `sst dev`.
 */
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;
// The stub API (e2e/stub-api) the build and the server read; set
// E2E_PORT per worktree so parallel runs don't share either port.
const stubPort = Number(process.env.STUB_API_PORT ?? port + 1000);
// The auth stub (e2e/stub-auth): signs viewers in and serves local images.
const authPort = Number(process.env.STUB_AUTH_PORT ?? port + 1100);
// Fake, local-only; never a real secret. Must match the auth stub's.
const stubSecret = 'local-stub-only';

/**
 * Opt-in tags, left out of a default run:
 * - `@perf`: timing checks (`E2E_PERF=1`).
 * - `@design`: pixel-exact design checks (exact sizes, gaps, positions),
 *   written against the developer's Mac. They run in the `design` project
 *   only, and only with `E2E_DESIGN=1`. Everything else measures relatively
 *   and holds on any machine (`e2e/README.md`).
 */
const optIn = [...(process.env.E2E_PERF ? [] : ['@perf']), '@design'];
const grepInvert = new RegExp(optIn.join('|'));

/**
 * `E2E_CLASSIC_SCROLLBARS=1`: Chromium draws a classic 15px scrollbar, as on
 * GitHub's macOS runners, instead of the Mac's overlay one (which takes no
 * room). Playwright hides scrollbars in headless Chromium by default, and
 * macOS overlays them: both are switched off. A launch option, so it reaches
 * every context, `browser.newContext()` ones included.
 */
const chromiumLaunch = process.env.E2E_CLASSIC_SCROLLBARS
  ? {
      launchOptions: {
        args: ['--disable-features=OverlayScrollbar'],
        ignoreDefaultArgs: ['--hide-scrollbars'],
      },
    }
  : {};

const chromium = { ...devices['Desktop Chrome'], ...chromiumLaunch };

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  grepInvert,
  projects: [
    {
      name: 'chromium',
      // `admin` is this project's teardown: it runs once every chromium test
      // has finished, pass or fail. As a dependency it would be skipped
      // ("did not run") whenever a single chromium test failed.
      teardown: 'admin',
      testIgnore: /admin-images\.spec\.ts|\.webkit\.spec\.ts/,
      use: chromium,
    },
    ...(process.env.E2E_DESIGN
      ? [
          {
            grep: /@design/,
            // `undefined` would fall back to the top-level one (`@design`)
            grepInvert: process.env.E2E_PERF ? /$^/ : /@perf/,
            name: 'design',
            testIgnore: /admin-images\.spec\.ts|\.webkit\.spec\.ts/,
            use: chromium,
          },
        ]
      : []),
    // Safari does not focus a button on click: the checks that need it
    // run in WebKit (`*.webkit.spec.ts`).
    {
      name: 'webkit',
      testMatch: /\.webkit\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
    // An admin save invalidates the show's cached shell (`updateTag`), so
    // the next visit regenerates it: run it after every shell/instant test
    // (it is the chromium project's teardown, above).
    {
      name: 'admin',
      testMatch: /admin-images\.spec\.ts/,
      use: chromium,
    },
  ],
  reporter: process.env.CI ? 'github' : 'list',
  testDir: './e2e',
  timeout: 45_000,
  // The trace recorder snapshots the whole DOM before every input action
  // (~55,000 forced layouts per wheel step on a 1,000-row History): timing
  // runs (`E2E_PERF=1`) go without it, or they measure Playwright
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: process.env.E2E_PERF ? 'off' : 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node e2e/stub-api/server.ts',
      env: {
        STUB_API_PORT: String(stubPort),
        STUB_ASSETS_URL: `http://localhost:${authPort}`,
      },
      reuseExistingServer: !process.env.CI,
      url: `http://localhost:${stubPort}/health`,
    },
    {
      command: 'node --conditions=react-server e2e/stub-auth/server.ts',
      env: {
        SECRET_KEY: stubSecret,
        STUB_AUTH_PORT: String(authPort),
        ...(process.env.STUB_IMG_DIR && {
          STUB_IMG_DIR: process.env.STUB_IMG_DIR,
        }),
      },
      reuseExistingServer: !process.env.CI,
      url: `http://localhost:${authPort}/health`,
    },
    {
      // The build prerenders against the stub (data at build time), so
      // instant() tests see the shared sections in the shell.
      command: `next build && next start --port ${port}`,
      env: {
        API_KEY: 'stub',
        API_URL: `http://localhost:${stubPort}`,
        AUTH_URL: `http://localhost:${authPort}`,
        EXPOSE_TESTING_API: '1',
        SECRET_KEY: stubSecret,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      url: baseURL,
    },
  ],
});
