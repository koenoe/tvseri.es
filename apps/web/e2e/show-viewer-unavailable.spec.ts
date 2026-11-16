import { expect, test } from '@playwright/test';

import { signInAs, stubFault } from './helpers/session';
import { progress } from './helpers/showPage';

/**
 * When the viewer's progress read fails, the show page says so
 * (never "0 of 47 watched"), its toggles are off with the reason, a press
 * writes nothing, and a retry brings the real state back.
 */

const SHOW = '/136315/the-bear';
const PROGRESS = '/watched/series/136315';

test.beforeEach(async ({ context }) => {
  await signInAs(context, 'alex');
});

test('a failed progress read shows an unavailable state and writes nothing', async ({
  page,
}) => {
  await stubFault('alex', { includes: PROGRESS, mode: '500' });
  await page.goto(SHOW);
  const status = page.locator(
    '[data-slot="progress"][data-state="unavailable"]',
  );
  await expect(status).toContainText('didn’t load');
  // the automatic retry fails too: still unavailable, with Try again
  await expect(status.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByText(/\d+ of 47 watched/)).toHaveCount(0);
  await expect(
    page.getByRole('button', {
      exact: true,
      name: 'Your progress didn’t load',
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: /^Favourite: your progress/ }),
  ).toBeDisabled();
  // A pill on the wall is off: a press only explains why.
  const pill = page.locator('[data-episode-tile] button[aria-pressed]').first();
  await expect(pill).toHaveAttribute('aria-disabled', 'true');
  const pressed = await pill.getAttribute('aria-pressed');
  // aria-disabled (it stays focusable and explains itself): press it anyway
  await pill.click({ force: true });
  await expect(
    page.getByText('Your progress for this series didn’t load'),
  ).toBeVisible();
  await expect(pill).toHaveAttribute('aria-pressed', pressed ?? 'false');
});

test('the retry brings the real progress back', async ({ page }) => {
  // Only the server's first read fails; the page's own retry answers.
  await stubFault('alex', { includes: PROGRESS, mode: '500', times: 1 });
  await page.goto(SHOW);
  await expect(progress(page)).toContainText('of 47');
  await expect(
    page.locator('[data-slot="progress"][data-state="unavailable"]'),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Favourite' })).toBeEnabled();
});
