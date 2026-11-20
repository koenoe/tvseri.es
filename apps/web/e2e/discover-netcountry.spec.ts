import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';
import { afterRelease } from './helpers/instantRelease';
import { expectShellFilled } from './helpers/warm';

/**
 * The Network and Country landings and the three index pages. The sample
 * slugs (hbo, gb) and the index pages prerender at build, so on a hard load
 * their hero (logo, counts, the tile) and first rows are in the shell inside
 * `instant()`. A client navigation to a slug commits the route's App Shell
 * (Partial Prefetching shares it across slugs: the crumb and the rows'
 * place); the slug's content follows.
 */

// visible only: while a streamed part waits for its swap, the resolved hero's
// crumb is in the document too (hidden)
const crumb = (page: Page) =>
  page.getByTestId('landing-crumb').filter({ visible: true });
const heading = (page: Page, name: string) =>
  page.getByRole('heading', { exact: true, level: 1, name });
const firstPoster = (page: Page, row: string) =>
  page.getByRole('region', { name: row }).getByRole('listitem').first();

async function expectHbo(page: Page, timeout?: number) {
  await expect(crumb(page).filter({ hasText: 'Networks' })).toBeVisible({
    timeout,
  });
  await expect(heading(page, 'HBO')).toBeVisible({ timeout });
  // the desktop line (phones get a shorter one)
  await expect(
    page.getByText(
      'Prestige drama since The Sopranos. Most of its series are finished stories you can start from the beginning.',
    ),
  ).toBeVisible({ timeout });
  await expect(page.getByText('381 series', { exact: true })).toBeVisible({
    timeout,
  });
  // the recommendation tile
  await expect(
    page.getByRole('button', { name: /watchlist/i }).first(),
  ).toBeVisible({ timeout });
  await expect(firstPoster(page, 'The best of HBO')).toBeVisible({ timeout });
}

async function expectGb(page: Page, timeout?: number) {
  await expect(crumb(page).filter({ hasText: 'Countries' })).toBeVisible({
    timeout,
  });
  await expect(heading(page, 'United Kingdom')).toBeVisible({ timeout });
  await expect(page.getByText('Mostly in English')).toBeVisible({ timeout });
  await expect(page.getByText('7,240 series')).toBeVisible({ timeout });
  await expect(page.getByText('Everyone’s favourite')).toBeVisible({ timeout });
  await expect(firstPoster(page, 'Made for')).toBeVisible({ timeout });
}

test.describe('network landing (/network/hbo)', () => {
  test('is instant on an initial page load', async ({
    page,
    baseURL,
    request,
  }) => {
    // the shell is the prerendered one, not a placeholder cached by a read
    // that timed out on a loaded machine
    await expectShellFilled(
      request,
      '/network/hbo',
      'Prestige drama since The Sopranos',
    );
    await instant(
      page,
      async () => {
        await page.goto('/network/hbo');
        await expectHbo(page);
        await expect(page.getByText('That’s HBO')).toBeVisible();
      },
      { baseURL },
    );
    await expect(
      page.getByText('First aired on HBO: about 340 of its 381 series'),
    ).toBeVisible({ timeout: afterRelease() });
  });

  test('is instant on a client navigation from /network', async ({ page }) => {
    await open(page, '/network');
    const link = page.getByRole('link', { exact: true, name: 'HBO' });
    await expect(link).toBeVisible();
    await instant(page, async () => {
      await link.click();
      await page.waitForURL((url) => url.pathname === '/network/hbo');
      await expect(crumb(page).filter({ hasText: 'Networks' })).toBeVisible();
    });
    await expectHbo(page, afterRelease());
  });

  test('switches The best of by decade in place', async ({ page }) => {
    await open(page, '/network/hbo');
    const row = page.locator('#network-best-rail');
    const switcher = page
      .getByRole('group', { name: 'By decade' })
      .filter({ visible: true });
    await expect(row.getByRole('link').first()).toBeVisible();
    const before = await row.getByRole('link').first().getAttribute('href');
    await switcher.getByRole('button', { name: '2020s' }).click();
    await expect(
      switcher.getByRole('button', { name: '2020s' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(row.getByRole('link').first()).not.toHaveAttribute(
      'href',
      before ?? '',
    );
  });

  test('redirects a TMDB id to the slug', async ({ request }) => {
    const response = await request.get('/network/49', { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe('/network/hbo');
  });

  test('answers an unknown network with the not-found page', async ({
    page,
  }) => {
    await open(page, '/network/not-a-network');
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });
});

test.describe('country landing (/country/gb)', () => {
  test('is instant on an initial page load', async ({
    page,
    baseURL,
    request,
  }) => {
    await expectShellFilled(request, '/country/gb', 'Mostly in English');
    await instant(
      page,
      async () => {
        await page.goto('/country/gb');
        await expectGb(page);
        await expect(page.getByText('That’s United Kingdom')).toBeVisible();
      },
      { baseURL },
    );
    await expect(
      page
        .getByRole('group', { name: 'Broadcaster' })
        .filter({ visible: true }),
    ).toBeVisible({ timeout: afterRelease() });
  });

  test('is instant on a client navigation from /country', async ({ page }) => {
    await open(page, '/country');
    const link = page.getByRole('link', {
      exact: true,
      name: 'United Kingdom',
    });
    await expect(link).toBeVisible();
    await instant(page, async () => {
      await link.click();
      await page.waitForURL((url) => url.pathname === '/country/gb');
      await expect(crumb(page).filter({ hasText: 'Countries' })).toBeVisible();
    });
    await expectGb(page, afterRelease());
  });

  test('hides Made for when fewer than 3 networks qualify (Denmark)', async ({
    page,
  }) => {
    await open(page, '/country/dk');
    await expect(
      page.getByRole('heading', { name: 'Best from Denmark' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Made for' })).toHaveCount(
      0,
    );
  });
});

test.describe('index pages', () => {
  for (const [path, title] of [
    ['/network', 'Networks'],
    ['/country', 'Countries'],
    ['/language', 'Languages'],
  ] as const) {
    test(`${path} is instant on an initial page load`, async ({
      page,
      baseURL,
    }) => {
      await instant(
        page,
        async () => {
          await page.goto(path);
          await expect(heading(page, title)).toBeVisible();
          await expect(crumb(page)).toContainText('Discover');
          await expect(page.getByText(/^That’s every /)).toBeVisible();
          // the list is prerendered too
          await expect(
            page.getByTestId('landing-index').getByRole('link').first(),
          ).toBeVisible();
        },
        { baseURL },
      );
    });
  }

  test('/country is instant on a client navigation from a country', async ({
    page,
  }) => {
    await open(page, '/country/gb');
    const link = crumb(page).getByRole('link', { name: 'Countries' });
    await expect(link).toBeVisible();
    await instant(page, async () => {
      await link.click();
      await page.waitForURL((url) => url.pathname === '/country');
      await expect(heading(page, 'Countries')).toBeVisible();
    });
  });
});
