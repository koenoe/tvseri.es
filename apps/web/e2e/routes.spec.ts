import { expect, test } from '@playwright/test';

// The root `[id]` route must never swallow a reserved first segment.
// (`/settings/*` needs a viewer: settings.spec.ts checks it isn't swallowed.)
const OWN_ROUTES: ReadonlyArray<readonly [url: string, testId: string]> = [
  ['/', 'route-home'],
  ['/discover', 'route-discover'],
  // the landing template's crumb (the placeholder's test id went with it)
  ['/genre/crime', 'landing-crumb'],
  // a stub fixture user: an unknown one is the 404 (the year renders in a Suspense child)
  ['/u/lena/stats/2026', 'route-stats'],
  ['/person/17419', 'route-person'],
  ['/1396/breaking-bad', 'route-show'],
  ['/privacy', 'route-privacy'],
  ['/extension', 'route-extension'],
];

for (const [url, testId] of OWN_ROUTES) {
  test(`${url} renders its own route`, async ({ page }) => {
    const response = await page.goto(url);
    expect(response?.status()).toBe(200);
    // While the page streams in, the suspended fallback and the real
    // content are in the DOM together: count 1 is the settled page
    // (and a duplicate that stayed would fail here).
    const route = page.getByTestId(testId);
    await expect(route).toHaveCount(1);
    await expect(route).toBeVisible();
  });
}

// Signed out, a profile is its own 401, not the root [id] route.
test('/u/margaux renders its own route', async ({ page }) => {
  const response = await page.goto('/u/margaux');
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: /Sign in to see @margaux’s profile/ }),
  ).toBeVisible();
});

// The Library tab renders its default shelf at its own URL, no redirect
test('/u/margaux/library renders its own route', async ({ page }) => {
  const response = await page.goto('/u/margaux/library');
  expect(response?.status()).toBe(200);
  expect(page.url()).toMatch(/\/u\/margaux\/library$/);
  await expect(
    page.getByRole('heading', { name: /Sign in to see @margaux’s profile/ }),
  ).toBeVisible();
});

// Non-numeric first segments serve the static 404 (no function run). A
// request is enough: the static 404 is whole in its HTML.
const STATIC_404 = [
  '/abc',
  '/abc/def',
  '/tv/abc',
  '/track/abc',
  '/12ab',
  '/person/abc',
  // ids longer than any TMDB id, Stats years without a page
  '/123456789',
  '/99999999999/some-slug',
  '/person/123456789',
  '/u/nina/stats/2099',
  // a Library shelf that isn't one, or anything below a shelf
  '/u/nina/library/junk',
  '/u/nina/library/watching/x',
];

// A landing slug that isn't one is the same static 404 (one rewrite per
// landing type, lib/routing/landingNotFound.ts), not a page that runs.
const LANDING_404 = [
  '/genre/not-a-genre',
  '/theme/constructor',
  '/network/not-a-network',
  '/country/zz',
  '/decade/2015s',
  '/language/zz',
];

test('junk segments and slugs are the static 404, never a route', async ({
  request,
}) => {
  for (const url of [...STATIC_404, ...LANDING_404]) {
    const response = await request.get(url);
    expect.soft(response.status(), url).toBe(404);
    const html = await response.text();
    expect.soft(html, url).toContain('<h1');
    expect.soft(html, url).not.toMatch(/data-testid="(route-|landing-crumb)/);
  }
});

test('robots.txt is not rewritten', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('Disallow: /');
});
