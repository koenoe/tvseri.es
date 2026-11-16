import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './session';

/**
 * The slice accordion on a touch screen, shared by the Chromium and WebKit
 * specs (the owner's Favourites on a 390 phone): the first tap on a closed
 * slice opens it and stays on the page; a tap on the open slice follows its
 * link. A mouse still opens a slice on hover and follows it on click.
 */
export function sliceTapSuite() {
  const openFavourites = async (page: Page) => {
    await page.goto('/u/alex');
    // hydrated: the header's username slot stops pulsing
    await page.waitForFunction(
      () => !document.querySelector('header [data-viewer-pending]'),
    );
    const favourites = page.locator('[data-slot="favourites"]');
    await favourites.scrollIntoViewIfNeeded();
    const slices = favourites.locator('[data-open]');
    await expect(slices.first()).toHaveAttribute('data-open', 'true');
    await page.waitForLoadState('networkidle');
    return slices;
  };

  test.describe('the slice accordion on a touch screen', () => {
    test.use({ hasTouch: true, viewport: { height: 844, width: 390 } });

    test('the first tap opens a closed slice, the second follows it', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      const slices = await openFavourites(page);
      const second = slices.nth(1);
      await expect(second).toHaveAttribute('data-open', 'false');
      const href = await second.locator('a').first().getAttribute('href');
      expect(href).toBeTruthy();

      await second.tap({ position: { x: 40, y: 28 } });
      await expect(second).toHaveAttribute('data-open', 'true');
      // still open once the finger has gone, and still here
      await page.waitForTimeout(600);
      await expect(second).toHaveAttribute('data-open', 'true');
      await expect(slices.first()).toHaveAttribute('data-open', 'false');
      expect(new URL(page.url()).pathname).toBe('/u/alex');

      await second.tap({ position: { x: 40, y: 28 } });
      await page.waitForURL((url) => url.pathname === href);
    });
  });

  test.describe('the slice accordion with a mouse', () => {
    test.use({ viewport: { height: 844, width: 390 } });

    test('a click on a closed slice follows it (hover has opened it)', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      const slices = await openFavourites(page);
      const second = slices.nth(1);
      const href = await second.locator('a').first().getAttribute('href');
      await second.click({ position: { x: 40, y: 28 } });
      await page.waitForURL((url) => url.pathname === href);
    });
  });
}
