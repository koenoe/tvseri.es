import { expect, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * The Season ledger lists three holes at most (`moreHoles`, unit-tested);
 * "+20 more" opens the rest in the show's history, at the first season it
 * leaves out.
 */
test('"+20 more" opens the rest in the show’s history', async ({ page }) => {
  await signInAs(page.context(), 'rae');
  await page.goto('/u/rae');
  const card = page.locator('[data-slot="season-ledger"]');
  await expect(card.getByText('Midsomer Murders')).toBeVisible();
  const more = card.getByRole('link', { name: '+20 more' });
  await expect(more).toHaveAttribute('href', /\?season=4&history$/);
});
