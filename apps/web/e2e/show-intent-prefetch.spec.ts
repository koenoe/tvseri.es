import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { PREFETCH_FETCH_LIMIT } from '../src/components/ui/tile/prefetchBudget';
import { afterRelease } from './helpers/instantRelease';
import { signInAs } from './helpers/session';

/**
 * Bug (PR #1012 preview): resting the mouse on the Spotlight's title asked
 * for nothing more than the shell, and the click showed the show's
 * skeleton. On Vercel a show without its own prerender answers its static
 * segment prefetch with the route's fallback shell, which Next re-requests
 * every 2s to pick up a concrete version Vercel never makes. Those fetches
 * ran the tile's prefetch budget (`prefetchBudget.ts`) out before any
 * hover, and the budget also blocked the per-link prefetch on intent.
 *
 * `next start` upgrades the fallback after one visit, so the rig fetches
 * the page's RSC `PREFETCH_FETCH_LIMIT` times itself: the state the
 * preview reached on its own.
 */

const PATH = '/225171/pluribus';

/** The per-link prefetch: Next's runtime prefetch (`next-router-prefetch: 2`) */
const isPerLink = (url: string, headers: Record<string, string>) =>
  new URL(url).pathname === PATH && headers['next-router-prefetch'] === '2';

/** Fetches the page's RSC until the budget has counted `PREFETCH_FETCH_LIMIT` */
const exhaustBudget = (page: Page) =>
  page.evaluate(
    ({ limit, path }) =>
      new Promise<void>((resolve) => {
        let seen = 0;
        // Observers are told in the order they subscribed: the budget's own
        // (subscribed at hydration) has counted each entry before this one
        new PerformanceObserver((list) => {
          seen += list
            .getEntries()
            .filter((entry) => new URL(entry.name).pathname === path).length;
          if (seen >= limit) {
            resolve();
          }
        }).observe({ type: 'resource' });
        for (let fetch = 0; fetch < limit; fetch++) {
          void window.fetch(`${path}?_rsc=budget${fetch}`, {
            headers: {
              'Next-Router-Prefetch': '1',
              'Next-Router-Segment-Prefetch': '/_tree',
              RSC: '1',
            },
          });
        }
      }),
    { limit: PREFETCH_FETCH_LIMIT, path: PATH },
  );

// Signed in, as the owner saw it (prefetches skip the proxy, so the session
// is read only by the per-link prefetch's render)
test('a resting mouse opens the Spotlight show whole after the budget ran out', async ({
  context,
  page,
}) => {
  await signInAs(context, 'alex');
  await page.goto('/');
  const spotlight = page.getByRole('region', { name: 'Trending spotlight' });
  // the slide must stay while the test rests on it
  await spotlight.getByRole('button', { name: 'Pause the slideshow' }).click();
  const title = spotlight
    .getByRole('group', { name: /^1 of 10: / })
    .getByRole('link', { name: 'Pluribus' });
  await expect(title).toHaveAttribute('href', PATH);
  await page.waitForLoadState('networkidle');
  await exhaustBudget(page);

  const perLink: string[] = [];
  page.on('request', (request) => {
    if (isPerLink(request.url(), request.headers())) {
      perLink.push(request.url());
    }
  });
  const prefetched = page.waitForResponse((response) =>
    isPerLink(response.url(), response.request().headers()),
  );
  await title.hover();
  await (await prefetched).finished();
  // A resting mouse asks for the page once, however long it rests. A time
  // wait, as the repeats were. Next's 2s fallback retries of the static
  // segment are not counted: on Vercel they happen whatever the app does.
  await page.waitForTimeout(5000);
  expect(perLink).toHaveLength(1);

  await instant(page, async () => {
    await title.click();
    await page.waitForURL((url) => url.pathname === PATH);
    // the show commits from the per-link prefetch, not its skeleton
    await expect(
      page.getByRole('heading', { level: 1, name: 'Pluribus' }),
    ).toBeVisible();
    await expect(page.getByTestId('show-skeleton')).toHaveCount(0);
  });
  await expect(page.getByTestId('route-show')).toBeVisible({
    timeout: afterRelease(),
  });
});
