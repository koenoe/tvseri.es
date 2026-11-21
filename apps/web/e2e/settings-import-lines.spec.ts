import { expect, test } from '@playwright/test';

import { signInAs, stubApiAs } from './helpers/session';

/**
 * The Import row's state line in the settings nav ("Imported N episodes
 * today") reads `GET /me` on the server: it follows an Undo import without a
 * reload (the importer refreshes the page once the API is done).
 */

test.use({ viewport: { height: 900, width: 1440 } });

const item = (episodeNumber: number) => ({
  episode: {
    airDate: '2019-09-13',
    episodeNumber,
    runtime: 50,
    seasonNumber: 1,
    stillPath: null,
    title: `Episode ${episodeNumber}`,
  },
  tvSeries: {
    id: 910002,
    posterPath: null,
    slug: 'top-boy',
    title: 'Top Boy',
  },
  watchedAt: Date.UTC(2024, 0, 10, 12),
});

test('the nav line follows Undo import without a reload', async ({ page }) => {
  await signInAs(page.context(), 'alex');
  const created = await stubApiAs('alex', '/me/imports', { method: 'POST' });
  const { importId } = (await created.json()) as { importId: string };
  const batch = await stubApiAs('alex', `/me/imports/${importId}/batch`, {
    body: [item(1), item(2)],
    method: 'POST',
  });
  expect(batch.status).toBe(201);

  await page.goto('/settings/import');
  const nav = page.getByRole('navigation', { name: 'Settings' });
  await expect(nav.getByText('Imported 2 episodes today')).toBeVisible();

  await page.getByRole('button', { name: 'Undo import' }).click();
  const dialog = page.getByRole('dialog', { name: 'Undo this import?' });
  await dialog.getByRole('button', { name: 'Undo import' }).click();
  await expect(page.getByText('Import undone', { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(nav.getByText('Upload your CSV file')).toBeVisible();
});
