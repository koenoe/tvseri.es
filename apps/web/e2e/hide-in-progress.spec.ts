import { expect, type Locator, type Page, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * Hide from in progress (the Remote's H, `paused: 'hide'`) takes the show out
 * of every in-progress list on the page at once, without a reload, and the
 * toast's Undo puts it back in place. `kit` is partway through The Bear
 * (Next up S03E05), with Dexter: Resurrection after it.
 */

test.use({ viewport: { height: 900, width: 1440 } });

test.beforeEach(async ({ page }) => {
  await signInAs(page.context(), 'kit');
});

async function hideAndUndo(page: Page, block: Locator, hero: () => Locator) {
  await expect(hero().getByText('S03E05', { exact: true })).toBeVisible();
  await block
    .getByRole('button', { name: /^More actions for The Bear/ })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole('menuitem', { name: /Hide from in progress/ }).click();

  // at once: The Bear leaves, the next show takes its place
  await expect(block.getByText('S03E05', { exact: true })).toHaveCount(0);
  await expect(
    block.getByRole('button', { name: /^More actions for The Bear/ }),
  ).toHaveCount(0);
  await expect(
    block.getByRole('link', { name: /^Dexter: Resurrection/ }).first(),
  ).toBeVisible();
  await expect(page.getByText('Hidden from in progress')).toBeVisible();

  // Undo: back where it was
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(hero().getByText('S03E05', { exact: true })).toBeVisible();
}

test('H on Home’s Continue watching hides the show at once; Undo restores it', async ({
  page,
}) => {
  await page.goto('/');
  const section = page.locator('[data-slot="continue"]');
  await hideAndUndo(page, section, () => section.locator('article').first());
});

test('H on the profile’s Up next hides the show at once; Undo restores it', async ({
  page,
}) => {
  await page.goto('/u/kit');
  const block = page.locator('section[aria-labelledby="up-next"]');
  await hideAndUndo(page, block, () => block.locator('article').first());
});
