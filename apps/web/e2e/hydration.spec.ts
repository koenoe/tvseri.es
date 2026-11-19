import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * No hydration error in the console, one page of each kind (the signed-in
 * show page is `show-viewer.spec.ts`'s). The pre-paint
 * scripts change `<html>` before React hydrates (`data-stats-year`,
 * `data-show-prompt`, `data-region`), so the root layout's `<html>` carries
 * `suppressHydrationWarning`; nothing below it may mismatch.
 *
 * A production build only reports structural mismatches. For the attribute
 * check run this spec against `next dev` (`E2E_PORT` of a dev server with the
 * stub: Playwright reuses a server that already answers).
 */
const THIS_YEAR = new Date().getUTCFullYear();

const PAGES = [
  ['Home', '/'],
  ['Discover', '/discover'],
  ['a show', '/136315/the-bear'],
  ['Stats', `/u/lena/stats/${THIS_YEAR - 1}`],
] as const;

const HYDRATION = /hydrat|didn'?t match|did not match|#418|#423|#425/i;

/** Console errors and page errors, from the first script on */
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** The page has loaded and hydrated: the lazy search chunk marks it */
async function settle(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-search-ready', '');
}

test.describe('hydration', () => {
  for (const [name, url] of PAGES) {
    test(`${name} hydrates with no error`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(url);
      await settle(page);
      expect(errors.filter((text) => HYDRATION.test(text))).toEqual([]);
    });
  }

  test('a profile, signed in, hydrates with no error', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    const errors = collectErrors(page);
    await page.goto('/u/alex');
    await settle(page);
    expect(errors.filter((text) => HYDRATION.test(text))).toEqual([]);
  });

  test('Settings, Plex with its week, signed in, hydrates with no error', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'rae');
    const errors = collectErrors(page);
    await page.goto('/settings/connected-apps');
    await settle(page);
    await expect(
      page.getByRole('group', { name: 'Your week on Plex' }),
    ).toBeVisible();
    expect(errors.filter((text) => HYDRATION.test(text))).toEqual([]);
  });
});
