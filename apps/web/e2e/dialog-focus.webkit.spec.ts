import { expect, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * Safari doesn't focus a button when it is clicked, so a dialog can't learn
 * its opener from `document.activeElement`: focus has to come back to the
 * control that was clicked (shared `Dialog`).
 */
test('focus returns to the clicked trigger after a dialog closes', async ({
  context,
  page,
}) => {
  await signInAs(context, 'alex');
  await page.goto('/settings/data');
  const trigger = page.getByRole('button', { name: 'Delete account' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
