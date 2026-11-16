import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * "Next up" outside the show page reads through the marking core: a mark
 * from Continue watching's eye, or the Remote's "Watched next episode" on
 * the profile, moves the tile on at once (no reload), and Undo moves it
 * back. `kit` is partway through The Bear (S02E05 skipped): Next up S03E05
 * "Children", then S03E06 "Napkins".
 */

test.use({ viewport: { height: 900, width: 1440 } });

function consoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  return errors;
}

test.beforeEach(async ({ page }) => {
  await signInAs(page.context(), 'kit');
});

test('Continue watching moves on after the eye, and back on Undo', async ({
  page,
}) => {
  const errors = consoleErrors(page);
  await page.goto('/');
  const section = page.locator('[data-slot="continue"]');
  const tile = section.locator('article').first();
  await expect(tile.getByText('S03E05', { exact: true })).toBeVisible();
  await expect(tile.getByText('Children', { exact: true })).toBeVisible();

  const markShown = () =>
    tile
      .getByRole('button', { name: 'Mark The Bear S03E05 as watched' })
      .filter({ visible: true })
      .click();

  // At once, before any reload; Undo (while its toast is up) moves it back
  await markShown();
  // The eye fetches the show's marks first (hover warms it): give a loaded
  // machine time
  await expect(tile.getByText('S03E06', { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(tile.getByText('S03E05', { exact: true })).toBeVisible();
  await expect(tile.getByText('Children', { exact: true })).toBeVisible();

  // Marked again: the following episode, its title, counts and eye
  await markShown();
  await expect(tile.getByText('S03E06', { exact: true })).toBeVisible();
  await expect(tile.getByText('Napkins', { exact: true })).toBeVisible();
  await expect(tile.getByText('5 of 10 watched')).toBeVisible();
  await expect(tile.getByText('Last watched S03E05 today')).toBeVisible();
  await expect(
    tile
      .getByRole('button', { name: 'Mark The Bear S03E06 as watched' })
      .filter({ visible: true }),
  ).toBeVisible();
  // The lane still lists the next show
  await expect(section.getByText('Dexter: Resurrection')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the profile’s Up next moves on after the Remote marks the next episode', async ({
  page,
}) => {
  const errors = consoleErrors(page);
  await page.goto('/u/kit');
  const block = page.locator('section[aria-labelledby="up-next"]');
  await expect(block.getByText('S03E05', { exact: true })).toBeVisible();

  await block.getByRole('button', { name: /^More actions for/ }).click();
  await page.getByRole('menuitem', { name: /Watched next episode/ }).click();
  // The card itself (the open Remote names the next episode too); its
  // link is named after the episode it opens
  const hero = block.locator('article').first();
  // The Remote fetches the show's marks when it opens: time on a loaded machine
  // the card's own badge: the Remote's menu, still closing on a slow run,
  // names the episode too ("Watched next episode S03E06")
  const badge = hero
    .getByText('S03E06', { exact: true })
    .locator('xpath=self::*[not(ancestor::*[@role="menuitem"])]');
  await expect(badge).toBeVisible({
    timeout: 15_000,
  });
  await expect(hero.getByText('Napkins', { exact: true })).toBeVisible();
  await expect(
    block.getByRole('link', { name: 'The Bear, S03E06 Napkins' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
