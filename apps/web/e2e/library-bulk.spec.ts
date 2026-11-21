import { expect, type Page, test } from '@playwright/test';

import { signInAs, stubApiAs } from './helpers/session';

/**
 * Select and the bulk actions, signed in as the stub's
 * `alex`; each test writes to its own stub namespace. Nothing here may
 * touch a watched episode: every test fails on a request to a watched route.
 */

const grid = (page: Page) => page.locator('[data-slot="library-grid"]');
const tiles = (page: Page) => grid(page).locator('ul > li');
/**
 * A tile's title. `textContent`, not `innerText`: the cells are
 * `content-visibility: auto`, and until the browser has painted them once
 * their rendered text is empty (on a busy machine the test read "" and then
 * matched every tile on the next shelf).
 */
const titleOf = async (page: Page, index: number) => {
  const title =
    (await tiles(page)
      .nth(index)
      .locator('span.truncate')
      .first()
      .textContent()) ?? '';
  expect(title.trim(), `tile ${index}'s title`).not.toBe('');
  return title.trim();
};

/** Fails the test on any watched write (marks, unmarks, batches) */
function forbidWatchedWrites(page: Page) {
  const seen: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (
      request.method() !== 'GET' &&
      /\/watched(\/|$|\?)/.test(new URL(url).pathname)
    ) {
      seen.push(`${request.method()} ${url}`);
    }
  });
  return seen;
}

test.describe('Select on your own Library', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page.context(), 'alex');
  });

  test('click, shift-click a run, remove them, Undo brings them back in order', async ({
    page,
  }) => {
    const watched = forbidWatchedWrites(page);
    await page.goto('/u/alex/library/watchlist?sort=oldest');
    await expect(tiles(page).nth(4)).toBeVisible();
    const before = await Promise.all(
      [0, 1, 2, 3, 4].map((i) => titleOf(page, i)),
    );
    await page.getByRole('button', { name: 'Select' }).click();
    await expect(
      page.getByText('Click posters to select. Shift-click selects a run.'),
    ).toBeVisible();
    await tiles(page).nth(0).getByRole('button').click();
    await tiles(page)
      .nth(2)
      .getByRole('button')
      .click({ modifiers: ['Shift'] });
    // the bar's count (a screen reader hears it from the status beside it)
    await expect(
      page
        .getByRole('toolbar', { name: 'Selected series' })
        .getByText('3 series selected'),
    ).toBeVisible();
    await expect(
      tiles(page).nth(1).getByRole('button', { pressed: true }),
    ).toBeVisible();
    await page
      .getByRole('toolbar', { name: 'Selected series' })
      .getByRole('button', { name: 'Remove from watchlist' })
      .click();
    await expect(
      page.getByText('Removed 3 series from your watchlist'),
    ).toBeVisible();
    await expect.poll(() => titleOf(page, 0)).toBe(before[3]);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect
      .poll(() => titleOf(page, 0), { timeout: 15_000 })
      .toBe(before[0]);
    expect(await Promise.all([0, 1, 2].map((i) => titleOf(page, i)))).toEqual(
      before.slice(0, 3),
    );
    expect(watched).toEqual([]);
  });

  test('Escape leaves select mode', async ({ page }) => {
    await page.goto('/u/alex/library/watchlist');
    await page.getByRole('button', { name: 'Select' }).click();
    await tiles(page).nth(0).getByRole('button').click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Select' })).toBeVisible();
    await expect(
      page.getByRole('toolbar', { name: 'Selected series' }),
    ).toHaveCount(0);
  });

  test('shows the API refused come back, with Try again', async ({ page }) => {
    await page.goto('/u/alex/library/watchlist');
    await expect(tiles(page).nth(2)).toBeVisible();
    const ids = await tiles(page)
      .locator('a')
      .evaluateAll((links) =>
        links
          .slice(0, 3)
          .map((link) => Number(link.getAttribute('href')?.split('/')[1])),
      );
    const response = await stubApiAs('alex', '/__stub/library-fail', {
      body: { ids: ids.slice(1, 3) },
      method: 'POST',
    });
    expect(response.ok).toBe(true);
    const titles = await Promise.all([0, 1, 2].map((i) => titleOf(page, i)));
    await page.getByRole('button', { name: 'Select' }).click();
    for (const index of [0, 1, 2]) {
      await tiles(page).nth(index).getByRole('button').click();
    }
    await page
      .getByRole('toolbar', { name: 'Selected series' })
      .getByRole('button', { name: 'Remove from watchlist' })
      .click();
    await expect(page.getByText('2 couldn’t be removed')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(tiles(page).filter({ hasText: titles[0] })).toHaveCount(0);
    for (const title of titles.slice(1)) {
      await expect(tiles(page).filter({ hasText: title })).toHaveCount(1);
    }
  });

  test('Hide from Watching puts the show on Hidden; Back to in progress returns it', async ({
    page,
  }) => {
    const watched = forbidWatchedWrites(page);
    await page.goto('/u/alex/library/watching');
    await expect(tiles(page).first()).toBeVisible();
    const title = await titleOf(page, 0);
    await page.getByRole('button', { name: 'Select' }).click();
    await tiles(page).nth(0).getByRole('button').click();
    await page
      .getByRole('toolbar', { name: 'Selected series' })
      .getByRole('button', { name: 'Hide from in progress' })
      .click();
    await expect(page.getByText('Hid 1 series from in progress')).toBeVisible();
    await page.goto('/u/alex/library/hidden');
    await expect(tiles(page).filter({ hasText: title })).toHaveCount(1);
    const tile = tiles(page).filter({ hasText: title });
    await tile.hover();
    await tile.getByRole('button', { name: /^More actions for/ }).click();
    await page
      .getByRole('menuitemcheckbox', { name: /Hidden from in progress/ })
      .click();
    await expect(tiles(page).filter({ hasText: title })).toHaveCount(0);
    await page.goto('/u/alex/library/watching');
    await expect(tiles(page).filter({ hasText: title })).toHaveCount(1);
    expect(watched).toEqual([]);
  });
});

test.describe('Select on a phone', () => {
  test.use({ hasTouch: true, viewport: { height: 844, width: 390 } });

  test('a long-press starts Select, a tap adds', async ({ page }) => {
    await signInAs(page.context(), 'alex');
    await page.goto('/u/alex/library/watchlist');
    await expect(tiles(page).nth(1)).toBeVisible();
    // a press: pointerdown starts the long-press timer, which selects on its
    // own; the release comes after Select has started
    await tiles(page)
      .nth(0)
      .locator('a')
      .dispatchEvent('pointerdown', { pointerType: 'touch' });
    await expect(page.getByText('1 selected')).toBeVisible();
    // in Select the tile's link is a button
    await tiles(page)
      .nth(0)
      .locator('a, button')
      .first()
      .dispatchEvent('pointerup', { pointerType: 'touch' });
    await expect(page.getByText('1 selected')).toBeVisible();
    await tiles(page).nth(1).getByRole('button').tap();
    await expect(page.getByText('2 selected')).toBeVisible();
  });
});
