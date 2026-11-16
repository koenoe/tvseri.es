import { expect, type Page, type Request, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * "Next up" outside the show page reads through the marking core: the
 * Remote's "Watched next episode" on Home's Continue watching or on the
 * profile moves the tile on at once (no reload), and Undo moves it
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

/** The server actions (the marks' writes) still out */
function serverActionsOut(page: Page) {
  const out = new Set<Request>();
  const isAction = (request: Request) =>
    request.method() === 'POST' && Boolean(request.headers()['next-action']);
  page.on('request', (request) => {
    if (isAction(request)) {
      out.add(request);
    }
  });
  page.on('requestfinished', (request) => out.delete(request));
  page.on('requestfailed', (request) => out.delete(request));
  return out;
}

test.beforeEach(async ({ page }) => {
  await signInAs(page.context(), 'kit');
});

test('Continue watching moves on after the Remote, and back on Undo', async ({
  page,
}) => {
  const errors = consoleErrors(page);
  const writes = serverActionsOut(page);
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Continue watching' });
  const tile = section.getByRole('article').first();
  await expect(tile.getByText('S03E05', { exact: true })).toBeVisible();
  await expect(tile.getByText('Children', { exact: true })).toBeVisible();

  // the card's own text: the open Remote's menu, still closing on a slow
  // run, names the next episode too ("Watched next episode S03E06")
  const onCard = (text: string) =>
    tile
      .getByText(text, { exact: true })
      .locator('xpath=self::*[not(ancestor::*[@role="menuitem"])]');
  const markNext = async () => {
    await tile
      .getByRole('button', { name: 'More actions for The Bear' })
      .click();
    await page.getByRole('menuitem', { name: /Watched next episode/ }).click();
  };

  // At once, before any reload; Undo (while its toast is up) moves it back
  await markNext();
  // The Remote fetches the show's marks when it opens: give a loaded
  // machine time
  await expect(onCard('S03E06')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(onCard('S03E05')).toBeVisible();
  await expect(onCard('Children')).toBeVisible();

  // Marked again once the writes are in
  await expect.poll(() => writes.size, { timeout: 15_000 }).toBe(0);
  await markNext();
  await expect(onCard('S03E06')).toBeVisible({ timeout: 15_000 });
  await expect(onCard('Napkins')).toBeVisible();
  await expect(tile.getByText('5 of 10 watched')).toBeVisible();
  await expect(tile.getByText('Last watched S03E05 today')).toBeVisible();
  // Continue watching has no eye any more: the ⋯ is its one control
  await expect(
    section.getByRole('button', { name: /^Mark The Bear/ }),
  ).toHaveCount(0);
  // The lane still lists the next show
  await expect(section.getByText('Dexter: Resurrection')).toBeVisible();
  // and its row ends in the same ⋯
  await expect(
    section.getByRole('button', {
      name: 'More actions for Dexter: Resurrection',
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('the profile’s Up next moves on after the Remote marks the next episode', async ({
  page,
}) => {
  const errors = consoleErrors(page);
  await page.goto('/u/kit');
  const block = page.getByRole('region', { name: 'Up next' });
  await expect(block.getByText('S03E05', { exact: true })).toBeVisible();

  await block.getByRole('button', { name: /^More actions for/ }).click();
  await page.getByRole('menuitem', { name: /Watched next episode/ }).click();
  // The card itself (the open Remote names the next episode too); its
  // link is named after the episode it opens
  const hero = block.getByRole('article').first();
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
