import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';
import { afterRelease } from './helpers/instantRelease';

/**
 * The Genre and Theme landings. The sample slugs
 * (crime, dystopia) prerender at build: on a hard load their hero and first
 * rows are in the shell. A client navigation commits the route's App Shell
 * (Partial Prefetching: a link prefetches the shell every slug shares, the
 * ground and the crumb); the slug's content follows from the prerender.
 */
// Cache Components keeps the page you left mounted but hidden (Activity), so
// only a visible crumb counts.
const crumb = (page: Page, kind: string) =>
  page.getByTestId('landing-crumb').filter({ hasText: kind, visible: true });
const heading = (page: Page, name: string) =>
  page.getByRole('heading', { exact: true, level: 1, name });
const firstPoster = (page: Page, row: string) =>
  page.getByRole('region', { name: row }).getByRole('listitem').first();

async function expectCrime(page: Page, timeout?: number) {
  await expect(crumb(page, 'Genres')).toBeVisible({ timeout });
  await expect(heading(page, 'Crime')).toBeVisible({ timeout });
  await expect(page.getByText('series on TMDB')).toBeVisible({ timeout });
  await expect(firstPoster(page, 'Trending in Crime')).toBeVisible({ timeout });
  await expect(
    page.getByRole('heading', { name: 'Where to start' }),
  ).toBeVisible({ timeout });
}

async function expectDystopia(page: Page, timeout?: number) {
  await expect(crumb(page, 'Themes')).toBeVisible({ timeout });
  await expect(heading(page, 'Dystopia')).toBeVisible({ timeout });
  await expect(page.getByText('Start here')).toBeVisible({ timeout });
  await expect(
    page.getByRole('link', { exact: true, name: 'Post-apocalyptic' }),
  ).toBeVisible({ timeout });
  await expect(firstPoster(page, 'The best dystopias')).toBeVisible({
    timeout,
  });
}

test.describe('genre landing (/genre/[slug])', () => {
  test('is instant on an initial page load', async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto('/genre/crime');
        await expectCrime(page);
      },
      { baseURL },
    );
  });

  test('is instant on a client navigation from the hub’s Genres', async ({
    page,
  }) => {
    // instant() blocks the network: the link's prefetch must have landed
    // before the tap, or there is no shell to commit.
    const prefetched = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/genre/crime' &&
        'next-router-prefetch' in response.request().headers(),
    );
    await open(page, '/discover');
    const tile = page.locator('a[href="/genre/crime"]').last();
    await tile.scrollIntoViewIfNeeded();
    await expect(tile).toBeVisible();
    await prefetched;
    await instant(page, async () => {
      await tile.click();
      await page.waitForURL((url) => url.pathname === '/genre/crime');
      await expect(crumb(page, 'Genres')).toBeVisible();
    });
    await expectCrime(page, afterRelease());
  });

  test('is instant on a client navigation to a genre’s theme', async ({
    page,
  }) => {
    await open(page, '/genre/crime');
    const chip = page.getByRole('link', { exact: true, name: 'Detectives' });
    await expect(chip).toBeVisible();
    await instant(page, async () => {
      await chip.click();
      await page.waitForURL((url) => url.pathname === '/theme/detectives');
      await expect(crumb(page, 'Themes')).toBeVisible();
    });
  });
});

test.describe('theme landing (/theme/[slug])', () => {
  test('is instant on an initial page load', async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto('/theme/dystopia');
        await expectDystopia(page);
        // signed out, the Start here tile's pair is in the shell
        const tile = page.locator('[data-slot="landing-hero"] article');
        await expect(
          tile.getByRole('button', { name: /^Add .+ to your watchlist$/ }),
        ).toBeVisible();
        await expect(
          tile.getByRole('button', { name: /^Mark .+ as seen$/ }),
        ).toBeVisible();
      },
      { baseURL },
    );
  });

  test('is instant on a client navigation from the hub’s Theme lens', async ({
    page,
  }) => {
    await open(page, '/discover');
    await page
      .getByRole('tablist', { name: 'Look at TV by' })
      .getByRole('tab', { name: 'Theme' })
      .click();
    const tile = page
      .locator('#lenses')
      .getByRole('link', { exact: true, name: 'Dystopia' });
    await expect(tile).toBeVisible();
    await instant(page, async () => {
      await tile.click();
      await page.waitForURL((url) => url.pathname === '/theme/dystopia');
      await expect(crumb(page, 'Themes')).toBeVisible();
    });
    await expectDystopia(page, afterRelease());
  });

  test('is instant on a client navigation between two themes', async ({
    page,
  }) => {
    await open(page, '/theme/dystopia');
    const chip = page.getByRole('link', {
      exact: true,
      name: 'Post-apocalyptic',
    });
    await expect(chip).toBeVisible();
    await instant(page, async () => {
      await chip.click();
      await page.waitForURL(
        (url) => url.pathname === '/theme/post-apocalyptic',
      );
      // the theme you came from is gone, so the crumb is the new page's
      await expect(heading(page, 'Dystopia')).toBeHidden();
      await expect(crumb(page, 'Themes')).toBeVisible();
    });
  });
});

test.describe('the theme list', () => {
  test('a theme renders with the name the list gives it', async ({ page }) => {
    await page.goto('/theme/time-travel');
    await expect(crumb(page, 'Themes')).toBeVisible();
    await expect(heading(page, 'Time travel')).toBeVisible();
    await expect(page).toHaveTitle(/^Time travel series/);
    await expect(
      firstPoster(page, 'The best time travel series'),
    ).toBeVisible();
  });

  test('a theme with a plural name writes its rows in the singular', async ({
    page,
  }) => {
    await page.goto('/theme/detectives');
    await expect(heading(page, 'Detectives')).toBeVisible();
    await expect(page).toHaveTitle(/^Detective series/);
    await expect(firstPoster(page, 'The best detective series')).toBeVisible();
  });

  test('a genre-bound theme renders', async ({ page }) => {
    await page.goto('/theme/medical-dramas');
    await expect(heading(page, 'Medical dramas')).toBeVisible();
    await expect(page.getByText('That’s medical dramas')).toBeVisible();
  });

  test('a retired theme is a real 404, not a redirect', async ({ request }) => {
    for (const path of ['/theme/heist', '/theme/detective', '/theme/romance']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
    }
  });
});

test.describe('genres TMDB only has as a keyword', () => {
  test('/genre/horror renders as a genre landing', async ({ page }) => {
    await page.goto('/genre/horror');
    await expect(crumb(page, 'Genres')).toBeVisible();
    await expect(heading(page, 'Horror')).toBeVisible();
    await expect(page).toHaveTitle(/^Horror series/);
    await expect(page.getByText('series on TMDB')).toBeVisible();
    await expect(firstPoster(page, 'Trending in Horror')).toBeVisible();
  });

  test('the hub’s Genres open Horror, Thriller and Romance', async ({
    page,
  }) => {
    await open(page, '/discover');
    const genres = page.locator('[data-slot="genres"]');
    for (const name of ['Horror', 'Thriller', 'Romance']) {
      await expect(
        genres.getByRole('link', { name: new RegExp(`^${name}`) }),
      ).toHaveAttribute('href', `/genre/${name.toLowerCase()}`);
    }
  });
});

test.describe('each landing on its own ground', () => {
  const bodyColour = (page: Page) =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const toRgb = (hex: string) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
  };

  test('two genres stand on different grounds, from their lead shows', async ({
    page,
  }) => {
    const grounds: string[] = [];
    for (const path of ['/genre/crime', '/genre/comedy']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      grounds.push(await bodyColour(page));
    }
    expect(grounds[0]).not.toBe(grounds[1]);
    // neither is the genre fallback: each comes from its lead show
    expect(grounds).not.toContain('rgb(28, 25, 22)');
  });

  test('the ground is in the server HTML, the only landing ground, and never changes after it lands', async ({
    page,
    request,
  }) => {
    const html = await (await request.get('/genre/crime')).text();
    const colours = new Set(
      [...html.matchAll(/--main-background-color: (#[0-9a-f]{6})/g)].map(
        (match) => match[1],
      ),
    );
    // one colour, the landing's own: no fallback ground to replace
    expect(colours.size).toBe(1);
    const ground = toRgb([...colours][0] ?? '');
    await page.addInitScript(() => {
      const frames: string[] = [];
      Object.assign(window, { __grounds: frames });
      const record = () => {
        if (document.body) {
          frames.push(getComputedStyle(document.body).backgroundColor);
        }
        if (frames.length < 60) {
          requestAnimationFrame(record);
        }
      };
      requestAnimationFrame(record);
    });
    await page.goto('/genre/crime');
    await page.waitForFunction(
      () =>
        (window as unknown as { __grounds: string[] }).__grounds.length >= 60,
    );
    const frames = await page.evaluate(
      () => (window as unknown as { __grounds: string[] }).__grounds,
    );
    // while the prerendered page parses, the site's ground; once the
    // landing's arrives (same document, no request), it never changes
    const first = frames.indexOf(ground);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(new Set(frames.slice(first))).toEqual(new Set([ground]));
    expect(new Set(frames.slice(0, first))).toEqual(
      first === 0 ? new Set() : new Set(['rgb(28, 34, 35)']),
    );
  });
});
