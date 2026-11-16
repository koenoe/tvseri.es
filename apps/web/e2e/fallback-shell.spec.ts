import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

/**
 * The shared fallback shell of a route with `generateStaticParams` (every
 * show but the seed, every person but the seed) and the 404 view those
 * routes render.
 *
 * Vercel regenerates a fallback shell by requesting the route's own path
 * with placeholders for the params (`/[id]/[[...slug]]`), and the function
 * applies the `beforeFiles` rewrites to it. `NOT_FOUND_REWRITE` once sent
 * that path to `/_not-found`, which the show route matched as id
 * `_not-found`: the regeneration rendered a 404 and Vercel served it for
 * every show that had no page of its own yet. `next start` never regenerates
 * a fallback that way, so the first test checks the build's manifests.
 */

const NEXT_DIR = path.resolve(import.meta.dirname, '../.next');

type DynamicRoute = Readonly<{ fallback?: unknown; routeRegex: string }>;
type Rewrite = Readonly<{
  destination: string;
  has?: unknown;
  regex: string;
}>;

const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(path.join(NEXT_DIR, file), 'utf8')) as T;

test('no rewrite turns a fallback shell into a page of its own route', () => {
  const { dynamicRoutes } = readJson<{
    dynamicRoutes: Record<string, DynamicRoute>;
  }>('prerender-manifest.json');
  const { rewrites } = readJson<{
    rewrites: { beforeFiles: ReadonlyArray<Rewrite> };
  }>('routes-manifest.json');
  const fallbacks = Object.values(dynamicRoutes).filter(
    (route): route is DynamicRoute & { fallback: string } =>
      typeof route.fallback === 'string',
  );
  expect(fallbacks.map(({ fallback }) => fallback)).toContain(
    '/[id]/[[...slug]]',
  );
  for (const { fallback, routeRegex } of fallbacks) {
    for (const rewrite of rewrites.beforeFiles) {
      // A rewrite with conditions never matches the bare regeneration request
      if (rewrite.has || !new RegExp(rewrite.regex).test(fallback)) {
        continue;
      }
      expect(
        new RegExp(routeRegex).test(rewrite.destination),
        `${fallback} is rewritten to ${rewrite.destination}, which its own route renders`,
      ).toBe(false);
    }
  }
});

// Shows without a page of their own: each first load is the shared fallback
// shell, the next one the show's own entry. Neither may be a 404.
for (const url of ['/1396/breaking-bad', '/900004/harbour-lights']) {
  test(`${url} answers 200 on every hard load`, async ({ page }) => {
    for (let load = 0; load < 3; load += 1) {
      const response = await page.goto(url);
      expect(response?.status(), `load ${load + 1}`).toBe(200);
      await expect(page.getByTestId('route-show')).toBeVisible();
    }
  });
}

/** Loads `url` without the app's scripts: the HTML as it paints before hydration */
async function gotoWithoutBundles(page: Page, url: string) {
  await page.route('**/_next/static/chunks/**', (route) => route.abort());
  return page.goto(url);
}

// The 404 view is in the HTML itself, not drawn by the client over the
// page's skeleton (a grey block until the scripts ran, for good if they
// failed). The first load streams after the shell (200, noindex).
for (const [label, url, skeleton] of [
  ['an unknown show', '/99881122/nothing', 'show'],
  ['an unknown person', '/person/99881122', 'person'],
] as const) {
  test(`${label} paints the 404 view before hydration`, async ({ page }) => {
    for (let load = 0; load < 2; load += 1) {
      await gotoWithoutBundles(page, url);
      await expect(page.getByText('Page not found')).toBeVisible();
      await expect(
        page.locator(`[data-placeholder="${skeleton}"]`),
      ).toBeHidden();
    }
    // The rig's testing API keeps every load on the first-visit path (a
    // streamed 200), so this checks its noindex. The 404 of the page's own
    // cached entry needs a server without the testing API.
    const html = await (await page.request.get(url)).text();
    expect(html).toMatch(/<meta name="robots" content="noindex"/);
  });
}
