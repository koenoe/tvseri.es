import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { TILE_PREFETCH } from '../src/components/ui/tile/tilePrefetch';
import { afterRelease } from './helpers/instantRelease';

/**
 * `instant()` gates dynamic data: what is asserted inside the callback must be
 * in the static shell. One focused test per route and entry point.
 */
test.describe('home (/)', () => {
  /**
   * The whole first screen is static and on the CDN: the
   * spotlight and the rows are `use cache` content prerendered into the
   * static shell (the e2e build runs against the stub API), so they are
   * there under the lock; only the signed-in touches stream.
   */
  const expectShell = async (page: Page) => {
    await expect(
      page.getByRole('region', { name: 'Trending spotlight' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: /^Top Picks for / }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Severance/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Hidden gems' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'New this week' }),
    ).toBeVisible();
  };

  test('is instant on an initial page load', async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto('/');
        await expectShell(page);
        await expect(
          page.getByRole('img', { name: 'tvseri.es' }).first(),
        ).toBeVisible();
        // signed out, the marking controls are in the shell: the slide's
        // pair and the Premieres tickets' Watchlist
        await expect(
          page.getByRole('button', { name: 'Add Pluribus to your watchlist' }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Mark Pluribus as seen' }),
        ).toBeVisible();
        await expect(
          page
            .locator('[data-slot="premieres"]')
            .getByRole('button', { name: /^Add .+ to your watchlist$/ })
            .first(),
        ).toBeAttached();
      },
      { baseURL },
    );
  });

  test('is instant on a client navigation from another page', async ({
    page,
  }) => {
    await page.goto('/discover');
    const home = page.getByRole('link', { name: 'tvseri.es home' });
    await expect(home).toBeVisible();
    await instant(page, async () => {
      await home.click();
      await page.waitForURL((url) => url.pathname === '/');
      await expectShell(page);
    });
  });
});

test.describe('show page (/{id}/{slug})', () => {
  const watchHistory = /open watch history/;

  test('is instant on an initial page load', async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto('/136315/the-bear');
        await expect(page.getByTestId('route-show')).toBeVisible();
        await expect(
          page.getByRole('heading', { level: 1, name: 'The Bear' }),
        ).toBeVisible();
        await expect(page.getByText('Created by:')).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Information' }),
        ).toBeVisible();
        // The episodes section's first row (the signed-out default season)
        // is shared content: in the static shell.
        await expect(
          page.locator('[data-episode-tile="S01E01"]').first(),
        ).toBeVisible();
        // The viewer's progress line is a hole: not in the static shell.
        await expect(
          page.getByRole('button', { name: watchHistory }),
        ).toHaveCount(0);
      },
      { baseURL },
    );
    // The viewer's holes fill in afterwards (signed out: the actions, no
    // personal progress line).
    await expect(
      page.getByRole('button', { name: 'More actions for The Bear' }).first(),
    ).toBeVisible({ timeout: afterRelease() });
  });

  test('is instant on a client navigation from another show', async ({
    page,
  }) => {
    // The stub's Breaking Bad recommends The Bear (fixtures/show-hero.ts).
    await page.goto('/1396/breaking-bad');
    const poster = page.getByRole('link', { name: 'The Bear' });
    await poster.scrollIntoViewIfNeeded();
    await expect(poster).toBeVisible();
    // A default <Link> prefetches the App Shell shared by every show (no
    // per-link prefetch), so the click shows the header and the
    // show's skeleton at once; the show itself streams in after.
    await instant(page, async () => {
      await poster.click();
      await page.waitForURL((url) => url.pathname === '/136315/the-bear');
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByTestId('show-skeleton')).toBeVisible();
      await expect(
        page.getByRole('heading', { level: 1, name: 'The Bear' }),
      ).toHaveCount(0);
    });
    await expect(
      page.getByRole('heading', { level: 1, name: 'The Bear' }),
    ).toBeVisible({ timeout: afterRelease() });
  });

  test('a poster prefetches on hover, so its click is served from the prefetch', async ({
    page,
  }) => {
    // The intent policy only (TILE_PREFETCH): in the viewport the poster's
    // page is prefetched before any hover, which the test above covers.
    test.skip(TILE_PREFETCH !== 'intent', 'tiles prefetch in the viewport');
    // Poster tiles don't prefetch in the viewport (TileLink): hovering one
    // fetches the show's App Shell (awaited below), so the click commits it
    // from the router cache. (From another show the shell is already cached
    // from the page itself, so this starts on a landing.) instant() admits a
    // navigation's static stage too, so it guards the shell, not the
    // prefetch: that is the awaited response.
    await page.goto('/genre/crime');
    const poster = page.locator('a[href="/100002/the-sopranos"]').first();
    await poster.scrollIntoViewIfNeeded();
    await expect(poster).toBeVisible();
    await page.waitForLoadState('networkidle');
    const prefetched = page.waitForResponse(
      (response) =>
        response.request().headers()['next-router-prefetch'] === '1' &&
        new URL(response.url()).pathname === '/100002/the-sopranos',
    );
    await poster.hover();
    await prefetched;
    await page.waitForLoadState('networkidle');
    await instant(page, async () => {
      await poster.click();
      await page.waitForURL((url) => url.pathname === '/100002/the-sopranos');
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByTestId('show-skeleton')).toBeVisible();
    });
    await expect(page.getByTestId('route-show')).toBeVisible({
      timeout: afterRelease(),
    });
  });
});
