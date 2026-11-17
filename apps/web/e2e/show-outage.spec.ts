import { expect, test } from '@playwright/test';

/**
 * The show page while the API is unavailable, with the stub's
 * outage ids (`stub-api/fixtures/show-outage.ts`): a core read that fails
 * shows the data-down page as the person page does, bounded by one fetch
 * timeout; a section whose read fails shows its static unavailable state in
 * its own space, never an endless skeleton. A 404 stays not found.
 */

const DATA_DOWN = 'Our series data is on a break.';
/** The web's fetch timeout (`FETCH_TIMEOUT`). */
const FETCH_TIMEOUT = 10_000;

test('a 503 on the show read shows the data-down page at once', async ({
  page,
}) => {
  await page.goto('/900090/down');
  await expect(page.getByRole('heading', { name: DATA_DOWN })).toBeVisible();
  await expect(page.getByTestId('route-show')).toHaveCount(0);
  await expect(
    page.getByRole('link', { exact: true, name: 'Home' }),
  ).toBeVisible();
});

test('a show read that never answers shows the data-down page after one timeout', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/900091/hang', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: DATA_DOWN })).toBeVisible({
    // the wait for it to come: one timeout plus rendering; two in a row
    // would be 20 s
    timeout: FETCH_TIMEOUT + 5000,
  });
});

test('an unknown show is still not found, not data down', async ({ page }) => {
  await page.goto('/999998/nothing');
  await expect(page.getByRole('heading', { name: DATA_DOWN })).toHaveCount(0);
  await expect(page.getByTestId('route-show')).toHaveCount(0);
});

test.describe('sections whose reads fail', () => {
  test('each shows its unavailable state in its space, not a skeleton', async ({
    page,
  }) => {
    await page.goto('/900092/partial-outage');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Partial Outage' }),
    ).toBeVisible();
    await expect(page.getByText('The cast didn’t load.')).toBeVisible();
    await expect(page.getByText('Recommendations didn’t load.')).toBeVisible();
    const wall = page.locator('[data-slot="episodes-unavailable"]').first();
    await expect(wall).toBeVisible();
    await expect(wall.getByText('Season 1 didn’t load.')).toBeVisible();
    // the dashed slots keep the loading wall's size: they frame the card
    // and run well past it
    const card = await wall.getByText('Season 1 didn’t load.').boundingBox();
    const box = await wall.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan((card?.height ?? 0) * 2);
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  });

  test('the episode modal shows its credits as unavailable', async ({
    page,
  }) => {
    await page.goto('/900092/partial-outage?season=1&episode=1');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.locator('[data-slot="credits-unavailable"]'),
    ).toBeVisible();
    await expect(dialog.getByText('The credits didn’t load.')).toBeVisible();
  });
});
