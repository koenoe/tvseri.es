import { expect, type Page, test } from '@playwright/test';

import { failRead, signInAs } from './helpers/session';

/**
 * One read that fails (a 500, or a hang past the web's 10 s timeout) never
 * takes a profile page down: the frame and every other block still render,
 * and only the part that read feeds says so. `out-<mode>-<read>` profiles
 * (`stub-api/fixtures/user-profile/outage.ts`) read like juno's, with the one
 * read named failing. The profile read itself (the user) fails the
 * identity and the blocks that need it, each in its own box.
 */

// A hang costs the web's 10 s timeout per read: every read fails with a
// 500, and the profile read (the one that once took the page down) hangs too
const MODES = ['500'] as const;

const expectNoDataDownPage = async (page: Page) => {
  await expect(page.getByText('Something broke')).toHaveCount(0);
};

/** The page is alive: handle, tab bar, no data-down screen */
const expectPageAlive = async (page: Page, username: string) => {
  await expect(page.getByRole('heading', { level: 1 })).toContainText(username);
  await expect(page.getByRole('navigation', { name: 'Profile' })).toBeVisible();
  await expect(page.getByText('Something broke')).toHaveCount(0);
};

test.describe('a failing read on a profile', () => {
  test.beforeEach(async ({ page }) => {
    // a hang is the fetch timeout (10 s) per read, and some pages make a few
    test.setTimeout(90_000);
    await signInAs(page.context(), 'alex');
  });

  for (const mode of MODES) {
    test(`the sidebar counts (${mode}) say so and the page stays`, async ({
      page,
    }) => {
      const username = `out-${mode}-counts`;
      await page.goto(`/u/${username}`);
      await expectPageAlive(page, username);
      // visible: the compact identity of a phone's sub-pages says it too, hidden here
      await expect(
        page
          .getByText('Counts unavailable right now')
          .filter({ visible: true }),
      ).toBeVisible({ timeout: 30_000 });
      // the other sidebar parts and the page's blocks arrive
      await expect(
        page.getByRole('region', { name: 'Recently watched' }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Something broke')).toHaveCount(0);
    });

    test(`the follow state (${mode}) turns the button off, not the page`, async ({
      page,
    }) => {
      const username = `out-${mode}-follow`;
      await page.goto(`/u/${username}`);
      await expectPageAlive(page, username);
      await expect(
        page.getByRole('button', { name: 'Follow, unavailable right now' }),
      ).toBeDisabled({ timeout: 30_000 });
      // the counts line still has its numbers
      await expect(page.getByText(/\d+ followers?/).first()).toBeVisible();
    });

    test(`the overview (${mode}) fails its blocks only`, async ({ page }) => {
      const username = `out-${mode}-overview`;
      await page.goto(`/u/${username}`);
      await expectPageAlive(page, username);
      await expect(
        page.getByRole('alert').filter({ hasText: 'didn’t load' }).first(),
      ).toBeVisible({ timeout: 30_000 });
      // blocks that do not read it still draw
      await expect(
        page.getByRole('region', { name: 'Favourites' }),
      ).toBeVisible();
      await expect(page.getByText('Counts unavailable')).toHaveCount(0);
    });

    test(`the match (${mode}) fails its card only`, async ({ page }) => {
      const username = `out-${mode}-match`;
      await page.goto(`/u/${username}`);
      await expectPageAlive(page, username);
      await expect(
        page.getByRole('alert').filter({ hasText: 'Your match didn’t load' }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByRole('button', { name: 'Following' }),
      ).toBeVisible();
    });

    test(`History (${mode}) fails its own block`, async ({ page }) => {
      const username = `out-${mode}-history`;
      await page.goto(`/u/${username}/history`);
      await expectPageAlive(page, username);
      await expect(
        page.getByRole('alert').filter({ hasText: 'History didn’t load' }),
      ).toBeVisible({ timeout: 30_000 });
    });

    test(`History's years (${mode}) fail Jump to only; the diary stays`, async ({
      page,
    }) => {
      const username = `out-${mode}-statsYears`;
      await page.goto(`/u/${username}/history`);
      await expectPageAlive(page, username);
      await expect(
        page.getByRole('alert').filter({ hasText: 'Jump to didn’t load' }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.locator('[data-diary] section[data-month]').first(),
      ).toBeVisible({ timeout: 30_000 });
    });

    test(`a Library shelf (${mode}) fails its grid, not the page`, async ({
      page,
    }) => {
      const username = `out-${mode}-library`;
      await page.goto(`/u/${username}/library/favourites`);
      await expectPageAlive(page, username);
      await expect(
        page.getByRole('alert').filter({ hasText: 'Favourites didn’t load' }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByRole('heading', { level: 2, name: 'Favourites' }),
      ).toBeVisible();
    });

    test(`the shelf counts (${mode}) fail alone: the shelf still draws`, async ({
      page,
    }) => {
      const username = `out-${mode}-librarySummary`;
      await page.goto(`/u/${username}/library/watchlist`);
      await expectPageAlive(page, username);
      await expect(
        page.locator('[data-slot="library-grid"] ul > li').first(),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/didn.t load/)).toHaveCount(0);
    });

    test(`your Circle (${mode}) fails its own block, not the sidebar`, async ({
      page,
    }) => {
      await failRead('alex', '/me/circle/people', mode);
      await page.goto('/u/alex/circle');
      await expectPageAlive(page, 'alex');
      await expect(
        page.getByRole('alert').filter({ hasText: 'Circle didn’t load' }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByRole('heading', { name: 'How a match is made' }),
      ).toBeVisible();
    });

    test(`someone else’s Circle (${mode}) fails its own block`, async ({
      page,
    }) => {
      const username = `out-${mode}-social`;
      await page.goto(`/u/${username}/circle`);
      await expectPageAlive(page, username);
      await expect(
        page.getByRole('alert').filter({ hasText: 'Circle didn’t load' }),
      ).toBeVisible({ timeout: 30_000 });
    });
  }

  // a profile read that fails or times out never takes the page to
  // "Something broke": the identity says so and the rest of the page stays
  for (const [mode, path] of [
    ['500', ''],
    ['500', '/library/watchlist'],
    ['hang', '/circle'],
  ] as const) {
    test(`the profile read (${mode}) fails the identity, not the page: ${path || 'overview'}`, async ({
      page,
    }) => {
      const username = `out-${mode}-user`;
      await page.goto(`/u/${username}${path}`);
      await expect(
        page
          .getByRole('alert')
          .filter({ hasText: 'Profile didn’t load', visible: true }),
      ).toBeVisible({ timeout: 30_000 });
      // the tabs still link every page, named from the URL
      const tabs = page.getByRole('navigation', { name: 'Profile' });
      await expect(tabs.getByRole('link', { name: 'Circle' })).toHaveAttribute(
        'href',
        `/u/${username}/circle`,
      );
      await expectNoDataDownPage(page);
    });
  }

  test('an unknown profile is still the not-found page', async ({ page }) => {
    // the unknown user is the 404 page (rendered from the stream), not the data-down one
    await page.goto('/u/nobody-here-at-all');
    await expect(page.getByText('Page not found')).toBeVisible();
    await expectNoDataDownPage(page);
  });
});
