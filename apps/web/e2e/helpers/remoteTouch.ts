import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './session';

/**
 * The lazy ⋯ on a touch screen, shared by the Chromium and WebKit
 * specs: a phone-width Library with touch, the Remote's code held back after
 * the page has loaded, so a tap on the ⋯ starts the load and the code lands
 * around the tap. The tap must open the Remote's sheet, once.
 */
export function remoteTouchSuite() {
  test.describe('the lazy ⋯ on a touch screen', () => {
    test.use({ hasTouch: true, viewport: { height: 844, width: 390 } });

    const holdLateChunks = async (page: Page, ms: number) => {
      await page.route('**/_next/static/chunks/*.js', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, ms));
        await route.continue();
      });
    };

    for (const delay of [0, 250]) {
      test(`a tap opens the Remote's sheet (code ${delay}ms late)`, async ({
        context,
        page,
      }) => {
        await signInAs(context, 'alex');
        await page.goto('/u/alex/library/watchlist');
        const tile = page.locator('[data-slot="library-grid"] ul > li').first();
        await expect(tile).toBeVisible();
        await page.waitForLoadState('networkidle');
        await holdLateChunks(page, delay);
        const more = tile.getByRole('button', { name: /^More actions for/ });
        const name = (await more.getAttribute('aria-label')) ?? '';
        await more.tap();
        const sheet = page.getByRole('dialog', {
          name: name.replace(/^More actions for/, 'Actions for'),
        });
        await expect(sheet).toBeVisible();
        await expect(sheet.getByRole('menu')).toHaveAttribute(
          'data-layout',
          'sheet',
        );
        // one open, not a second tap's close
        await page.waitForTimeout(600);
        await expect(sheet).toBeVisible();
      });
    }
  });
}
