import { expect, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * One rule: the profile, Stats and Settings sidebars
 * appear from lg (1024); below it those pages use the phone's shell, the
 * identity on top and Settings' section list on its own page.
 */

for (const width of [1023, 1024] as const) {
  const sidebar = width >= 1024;
  const which = sidebar ? 'the sidebar' : "the phone's shell";

  test.describe(`at ${width}px: ${which}`, () => {
    test.use({ viewport: { height: 900, width } });

    test('profile: the identity beside the tabs or above them', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.goto('/u/alex');
      const aside = page.locator('aside').first();
      const tab = page.getByRole('link', { exact: true, name: 'Overview' });
      await expect(tab).toBeVisible();
      const asideBox = await aside.boundingBox();
      const tabBox = await tab.boundingBox();
      expect(asideBox && tabBox).toBeTruthy();
      if (asideBox && tabBox) {
        if (sidebar) {
          expect(asideBox.x + asideBox.width).toBeLessThanOrEqual(tabBox.x);
        } else {
          expect(asideBox.y + asideBox.height).toBeLessThanOrEqual(tabBox.y);
        }
      }
    });

    test('library: the shelf nav in the sidebar or chips under the tabs', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.goto('/u/alex/library/watching');
      const nav = page.locator('[data-slot="shelf-nav"]');
      const chips = page.locator('[data-slot="shelf-chips"]');
      await expect(sidebar ? nav : chips).toBeVisible();
      await expect(sidebar ? chips : nav).toBeHidden();
    });

    test('stats: the sidebar or the phone header', async ({ page }) => {
      await page.goto('/u/lena/stats/2025');
      const aside = page.locator('[data-slot="stats-aside"]');
      const head = page.locator('[data-slot="stats-phone-head"]');
      await expect(sidebar ? aside : head).toBeVisible();
      await expect(sidebar ? head : aside).toBeHidden();
    });

    test('settings: the nav beside a section, or the list and a back bar', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.goto('/settings/plex');
      const nav = page.getByRole('navigation', { name: 'Settings' });
      const back = page.getByRole('link', { exact: true, name: 'Settings' });
      await expect(
        page.getByRole('heading', { name: 'Connected apps' }),
      ).toBeVisible();
      await expect(sidebar ? nav : back).toBeVisible();
      await expect(sidebar ? back : nav).toBeHidden();

      // `/settings` never moves: Profile beside the sidebar, or the list
      await page.goto('/settings');
      const profile = page.getByTestId('route-settings-profile');
      await expect(nav).toBeVisible();
      if (sidebar) {
        await expect(profile).toBeVisible();
      } else {
        await expect(profile).toBeHidden();
      }
      await page.waitForLoadState('networkidle');
      expect(new URL(page.url()).pathname).toBe('/settings');
    });
  });
}
