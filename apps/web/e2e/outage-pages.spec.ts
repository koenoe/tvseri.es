import { expect, type Page, test } from '@playwright/test';

import { failRead, signInAs } from './helpers/session';

/**
 * One read that fails never takes a page down. Per page kind: Home's personal rows, the show's viewer
 * holes, Settings' sections and the Stats blocks each render with only the
 * part that read feeds failed. (Profiles: `profile-outage.spec.ts`.)
 */

// A 500 here: a hang costs the web's 10 s timeout, and the hang's own path is
// covered once per page kind elsewhere (`show-outage`, `home-continue`,
// `profile-outage`)
const MODES = ['500'] as const;

const expectNoDataDownPage = async (page: Page) => {
  await expect(page.getByText('Something broke')).toHaveCount(0);
};

test.describe('a failing read on Home', () => {
  for (const mode of MODES) {
    test(`Continue watching (${mode}) fails alone`, async ({ page }) => {
      test.setTimeout(90_000);
      await signInAs(page.context(), 'alex');
      await failRead('alex', '/me/overview', mode);
      await page.goto('/');
      await expect(
        page.getByRole('alert').filter({ hasText: 'Continue watching' }),
      ).toBeVisible({ timeout: 30_000 });
      // the shared rows are untouched
      await expect(
        page.getByRole('region', { name: 'Hidden gems' }),
      ).toBeVisible();
      await expectNoDataDownPage(page);
    });
  }
});

test.describe('a failing read on the show page', () => {
  for (const [what, includes, modes] of [
    ['the viewer’s marks', '/user/', MODES],
    ['the list status', '/me/series/', MODES],
  ] as const) {
    for (const mode of modes) {
      test(`${what} (${mode}) leave the show on screen`, async ({ page }) => {
        test.setTimeout(90_000);
        await signInAs(page.context(), 'alex');
        await failRead('alex', includes, mode);
        await page.goto('/136315/the-bear');
        await expect(
          page.getByRole('heading', { level: 1, name: 'The Bear' }),
        ).toBeVisible({ timeout: 30_000 });
        await expect(
          page.getByRole('region', { name: 'Episodes' }),
        ).toBeVisible({
          timeout: 30_000,
        });
        await expectNoDataDownPage(page);
      });
    }
  }
});

test.describe('a failing read in Settings', () => {
  for (const mode of MODES) {
    test(`the Plex status (${mode}) fails only its card`, async ({ page }) => {
      test.setTimeout(90_000);
      await signInAs(page.context(), 'alex');
      await failRead('alex', '/webhook/', mode);
      await page.goto('/settings/connected-apps');
      await expect(
        page.getByRole('heading', { level: 2, name: 'Connected apps' }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByRole('navigation', { name: 'Settings' }),
      ).toBeVisible();
      // the nav and the hero leave Plex out instead of guessing
      await expect(
        page.getByRole('link', { name: /Profile/ }).first(),
      ).toBeVisible({
        timeout: 30_000,
      });
      await expectNoDataDownPage(page);
    });
  }
});

test.describe('a failing read in Stats', () => {
  for (const mode of MODES) {
    test(`one block (${mode}) says it did not load, the page stays`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await signInAs(page.context(), 'alex');
      await page.goto(`/u/out-${mode}-stats/stats/2026`);
      await expect(page.getByText(/didn’t load/).first()).toBeVisible({
        timeout: 40_000,
      });
      await expect(page.getByText(`out-${mode}-stats`).first()).toBeVisible();
      await expectNoDataDownPage(page);
    });
  }

  // The show art is a cached read inside the Stats' own cached reads: only
  // a production build (`next start`) carries its failure across `use cache`
  test('a show read that fails leaves Finished and Biggest night without art, and the card says unavailable', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    await page.goto('/u/out-500-art/stats/2025');
    await expect(
      page.getByRole('heading', { name: 'Finished in 2025' }),
    ).toBeVisible({ timeout: 40_000 });
    await expect(
      page.getByRole('heading', { name: 'Biggest night' }),
    ).toBeVisible();
    await expect(page.getByText(/didn’t load/)).toHaveCount(0);
    await expectNoDataDownPage(page);
    const card = await request.get('/u/out-500-art/stats/2025/card');
    expect(card.status()).toBe(503);
  });
});
