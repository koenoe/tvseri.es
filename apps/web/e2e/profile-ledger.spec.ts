import { expect, type Page, test } from '@playwright/test';

import { TOLERANCE } from './helpers/parity';
import { signInAs } from './helpers/session';

/**
 * The Season ledger lists three holes at most:
 * rae's Midsomer Murders has 23 missing episodes and alex's has 3, and both
 * cards are the same height. "+20 more" opens the
 * rest in the show's history.
 */

const ledgerHeight = async (page: Page) => {
  const card = page.locator('[data-slot="season-ledger"]');
  await expect(card.getByText('Midsomer Murders')).toBeVisible();
  const box = await card.boundingBox();
  return box?.height ?? 0;
};

test(`a show with 23 holes lists three, at 390px`, async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 390 });
  await signInAs(page.context(), 'alex');
  await page.goto('/u/alex');
  const typical = await ledgerHeight(page);

  await signInAs(page.context(), 'rae');
  await page.goto('/u/rae');
  const card = page.locator('[data-slot="season-ledger"]');
  const heavy = await ledgerHeight(page);

  await expect(card.getByRole('button', { name: 'Watched' })).toHaveCount(3);
  await expect(card.getByText('23 episodes missing')).toBeVisible();
  const more = card.getByRole('link', { name: '+20 more' });
  await expect(more).toHaveAttribute('href', /\?season=4&history$/);
  // the three listed holes keep the heavy card at the typical one's height
  expect(Math.abs(heavy - typical)).toBeLessThanOrEqual(TOLERANCE);
});
