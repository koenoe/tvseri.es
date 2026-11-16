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

// Non-numeric first segments serve the static 404 (no function run).
for (const url of [
  '/abc',
  '/abc/def',
  '/tv/abc',
  '/track/abc',
  '/this-does-not-exist',
  '/12ab',
  '/person/abc',
  // ids longer than any TMDB id, Stats years without a page
  '/123456789',
  '/99999999999/some-slug',
  '/person/123456789',
  '/u/nina/stats/2099',
  '/u/nina/stats/1999',
  // a Library shelf that isn't one, or anything below a shelf
  '/u/nina/library/junk',
  '/u/nina/library/watching/x',
]) {
  test(`${url} is the static 404`, async ({ page }) => {
    const response = await page.goto(url);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId(/^route-/)).toHaveCount(0);
  });
}

// A landing slug that isn't one is the same static 404 (one rewrite per
// landing type, lib/routing/landingNotFound.ts), not a page that runs.
for (const url of [
  '/genre/not-a-genre',
  '/theme/constructor',
  '/network/not-a-network',
  '/country/zz',
  '/decade/2015s',
  '/decade/1850s',
  '/language/zz',
]) {
  test(`${url} is the static 404`, async ({ page }) => {
    const response = await page.goto(url);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('landing-crumb')).toHaveCount(0);
  });
}

test('robots.txt is not rewritten', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('Disallow: /');
});
