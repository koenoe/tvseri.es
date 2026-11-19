import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  chromium as chromiumType,
  defineConfig,
  devices,
} from '@playwright/test';

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
 * `@perf` timing checks depend on the machine's load, so they are opt-in
 * (`E2E_PERF=1`) and never in CI.
 */
const grepInvert = process.env.E2E_PERF ? undefined : /@perf/;

/**
 * `E2E_CLASSIC_SCROLLBARS=1`: Chromium draws a classic 15px scrollbar, as on
 * GitHub's macOS runners, instead of the Mac's overlay one (which takes no
 * room). Playwright hides scrollbars in headless Chromium by default, and
 * macOS overlays them: both are switched off. A launch option, so it reaches
 * every context, `browser.newContext()` ones included.
 */
const classicLaunch = process.env.E2E_CLASSIC_SCROLLBARS
  ? {
      args: ['--disable-features=OverlayScrollbar'],
      ignoreDefaultArgs: ['--hide-scrollbars'],
    }
  : {};

/**
 * `E2E_SLOW=1`: about as slow as a GitHub macOS runner, to reproduce a
 * runner-only failure. Chromium and `next start` run at macOS's background
 * QoS (`e2e/slow/clamped.sh`: the efficiency cores, low priority; set
 * `E2E_SLOW_CLAMP=utility` for less), and two workers share them
 * (`E2E_SLOW_WORKERS`). The browser is Playwright's own headless shell,
 * started through the clamp.
 */
const slow = Boolean(process.env.E2E_SLOW);
/**
 * The clamp runs everything several times slower than a runner does: the
 * budgets grow with it, so what fails is a race (a check that read too
 * early), not a test that ran out of time.
 */
const slowFactor = slow ? 3 : 1;
const clamp = join(import.meta.dirname, 'e2e', 'slow', 'clamped.sh');

/** Playwright's headless shell, the binary a headless run uses */
function headlessShell(): string {
  // …/ms-playwright/chromium-<rev>/… → …/ms-playwright/chromium_headless_shell-<rev>/<dir>/chrome-headless-shell
  const full = chromiumType.executablePath();
  const match = /^(.*)[/\\]chromium-(\d+)[/\\]/.exec(full);
  if (!match?.[1]) {
    throw new Error(`E2E_SLOW: no Playwright Chromium found (${full})`);
  }
  const root = join(match[1], `chromium_headless_shell-${match[2]}`);
  const binary = existsSync(root)
    ? readdirSync(root)
        .map((dir) => join(root, dir, 'chrome-headless-shell'))
        .find((path) => existsSync(path))
    : undefined;
  if (!binary) {
    throw new Error(`E2E_SLOW: no headless shell in ${root}`);
  }
  return binary;
}

if (slow) {
  // read by the clamp script, which the browser inherits the env of
  process.env.E2E_SLOW_REAL = headlessShell();
}

const slowLaunch = slow ? { executablePath: clamp } : {};

const chromium = {
  ...devices['Desktop Chrome'],
  launchOptions: { ...classicLaunch, ...slowLaunch },
};

export default defineConfig({
  expect: { timeout: 10_000 * slowFactor },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  ...(slow && { workers: Number(process.env.E2E_SLOW_WORKERS ?? 2) }),
  ...(grepInvert && { grepInvert }),
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
  // In CI `list` takes the place of the dots Playwright adds beside `github`:
  // its per-test durations are what the shard weights in e2e.yml are cut from
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  testDir: './e2e',
  timeout: 45_000 * slowFactor,
  // The trace recorder snapshots the whole DOM before every input action
  // (~55,000 forced layouts per wheel step on a 1,000-row History): timing
  // runs (`E2E_PERF=1`) go without it, or they measure Playwright, not the page.
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
      // The extension's zip first, as `pnpm build` does (/extension links it)
      command: slow
        ? `node scripts/extension-zip.ts && next build && E2E_SLOW_REAL=$(command -v next) ${clamp} start --port ${port}`
        : `node scripts/extension-zip.ts && next build && next start --port ${port}`,
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
