import { instant } from '@next/playwright';
import { expect, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * The profile calendar (`/u/{username}/calendar`): your shows' dates a
 * month at a time; a day opens its tickets. Yours only for now. alex's
 * stub calendar has an episode today (Midsomer Murders).
 */

test.beforeEach(async ({ context }) => {
  await signInAs(context, 'alex');
});

test('Coming up leads to the calendar, where today opens its tickets', async ({
  page,
}) => {
  await page.goto('/u/alex');
  const comingUp = page.getByRole('region', { name: 'Coming up' });
  await expect(comingUp.getByRole('link', { name: 'Calendar' })).toBeVisible();
  await instant(page, async () => {
    await comingUp.getByRole('link', { name: 'Calendar' }).click();
    await page.waitForURL('**/u/alex/calendar');
    await expect(
      page.getByRole('navigation', { name: 'Profile' }),
    ).toBeVisible();
  });
  await expect(
    page.getByRole('link', { exact: true, name: 'Calendar' }),
  ).toHaveAttribute('aria-current', 'page');

  const today = page.getByRole('grid').locator('[aria-current="date"]');
  await expect(today).toHaveAccessibleName(/Midsomer Murders/);
  await today.click();
  const day = page.getByRole('dialog');
  await expect(day.getByRole('heading', { level: 3 })).toBeVisible();
  await expect(
    day.getByRole('link', { name: /Midsomer Murders/ }),
  ).toHaveAttribute('href', /midsomer/);
  await expect(page).toHaveURL(/[?&]day=\d{4}-\d{2}-\d{2}/);

  // Esc closes it and gives focus back to the day
  await page.keyboard.press('Escape');
  await expect(day).toBeHidden();
  await expect(today).toBeFocused();
  await expect(page).not.toHaveURL(/day=/);
});

test('someone else’s calendar goes to their profile', async ({ page }) => {
  await page.goto('/u/juno/calendar');
  await page.waitForURL((url) => url.pathname === '/u/juno');
  await expect(
    page
      .getByRole('navigation', { name: 'Profile' })
      .getByRole('link', { name: 'Calendar' }),
  ).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { height: 844, width: 390 } });

  test('a day opens as a bottom sheet of its tickets', async ({ page }) => {
    await page.goto('/u/alex/calendar');
    await page.getByRole('grid').locator('[aria-current="date"]').click();
    const sheet = page.getByRole('dialog');
    await expect(
      sheet.getByRole('link', { name: /Midsomer Murders/ }),
    ).toBeVisible();
    await sheet.getByRole('button', { name: 'Close' }).click();
    await expect(sheet).toBeHidden();
  });
});
