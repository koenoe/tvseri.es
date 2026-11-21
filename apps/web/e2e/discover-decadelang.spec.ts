import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';
import { afterRelease } from './helpers/instantRelease';

/**
 * The Decade and Language landings: on a hard load of the sample slug the
 * prerendered shell (crumb, title, meta line, script switch, the treemap
 * with its card, the title wall, the first rows) commits under `instant()`;
 * a client navigation from the hub commits the App Shell every slug shares
 * (the crumb), and the slug's content follows.
 * Their client islands (tile selection, script switch) respond.
 */

// Cache Components keeps the page you left mounted but hidden (Activity), so
// only a visible crumb counts.
const crumb = (page: Page, kind: string) =>
  page.getByTestId('landing-crumb').filter({ hasText: kind, visible: true });
const heading = (page: Page, name: string) =>
  page.getByRole('heading', { exact: true, level: 1, name });
const lensTabs = (page: Page) =>
  page.getByRole('tablist', { name: 'Look at TV by' });

test.describe('decade landing (/decade/2010s)', () => {
  test('is instant on an initial page load', async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto('/decade/2010s');
        await expect(crumb(page, 'Decades')).toBeVisible();
        await expect(heading(page, '2010s')).toBeVisible();
        await expect(page.getByText('2010 to 2019')).toBeVisible();
        // the landscape is prerendered: the treemap and its card
        await expect(
          page.getByRole('button', { name: /^Game of Thrones, [\d,]+ votes/ }),
        ).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByText('Most rated of the decade')).toBeVisible();
        // signed out, the card's Watchlist + Seen it pair is in the shell
        await expect(
          page.getByRole('button', {
            name: 'Add Game of Thrones to your watchlist',
          }),
        ).toBeVisible();
        // the first row below it too
        await expect(
          page
            .getByRole('region', { name: 'Missed by most' })
            .getByRole('listitem')
            .first(),
        ).toBeVisible();
      },
      { baseURL },
    );
  });

  test('is instant on a client navigation from the hub', async ({ page }) => {
    await open(page, '/discover');
    await lensTabs(page).getByRole('tab', { name: 'Decade' }).click();
    await page.getByRole('button', { exact: true, name: '2010s' }).click();
    const link = page.locator('a[href="/decade/2010s"]').first();
    await expect(link).toBeVisible();
    await instant(page, async () => {
      await link.click();
      await page.waitForURL((url) => url.pathname === '/decade/2010s');
      // the App Shell every decade shares (Partial Prefetching)
      await expect(crumb(page, 'Decades')).toBeVisible();
    });
    await expect(heading(page, '2010s')).toBeVisible({
      timeout: afterRelease(),
    });
    await expect(page.getByText('Most rated of the decade')).toBeVisible();
  });

  test('selecting a tile swaps the card', async ({ page }) => {
    await open(page, '/decade/2010s');
    const tile = page.getByRole('button', { name: /^Stranger Things, / });
    await tile.click();
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Number 3 by attention')).toBeVisible();
  });
});

test.describe('language landing (/language/ja)', () => {
  test('is instant on an initial page load', async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto('/language/ja');
        await expect(crumb(page, 'Languages')).toBeVisible();
        await expect(heading(page, '日本語')).toBeVisible();
        await expect(
          page.getByRole('group', { name: 'Show titles in' }).first(),
        ).toBeVisible();
        // Start here and the title wall are prerendered
        await expect(
          page
            .getByRole('region', { name: 'Start here' })
            .getByRole('listitem')
            .first(),
        ).toBeVisible();
        await expect(page.getByText('葬送のフリーレン')).toBeVisible();
      },
      { baseURL },
    );
  });

  test('is instant on a client navigation from the hub', async ({ page }) => {
    await open(page, '/discover');
    await lensTabs(page).getByRole('tab', { name: 'Language' }).click();
    const link = page.locator('a[href="/language/ja"]').first();
    await expect(link).toBeVisible();
    await instant(page, async () => {
      await link.click();
      await page.waitForURL((url) => url.pathname === '/language/ja');
      // the App Shell every language shares (Partial Prefetching)
      await expect(crumb(page, 'Languages')).toBeVisible();
    });
    await expect(heading(page, '日本語')).toBeVisible({
      timeout: afterRelease(),
    });
    await expect(page.getByText('葬送のフリーレン')).toBeVisible();
  });

  test('the script switch changes every title on the wall', async ({
    page,
  }) => {
    await open(page, '/language/ja');
    await expect(page.getByText('葬送のフリーレン')).toBeVisible();
    const scripts = page.getByRole('group', { name: 'Show titles in' }).first();
    await scripts.getByRole('button', { name: 'Rōmaji' }).click();
    await expect(page.getByText('Sōsō no Furīren')).toBeVisible();
    await expect(page.getByText('葬送のフリーレン')).toHaveCount(0);
    await scripts.getByRole('button', { name: 'English' }).click();
    // the titles cross-fade: the switch is done once the Rōmaji copies left
    await expect(page.getByText('Sōsō no Furīren')).toHaveCount(0);
    await expect(
      page.getByText('Frieren: Beyond Journey’s End', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('葬送のフリーレン')).toBeVisible();
  });
});
