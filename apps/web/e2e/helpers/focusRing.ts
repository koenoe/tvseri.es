import { expect, type Locator, type Page, test } from '@playwright/test';

import { field, open, dialog as searchDialog } from './search';
import { signInAs } from './session';

/**
 * Focus going back to an overlay's trigger shows the ring only when the
 * overlay was opened from the keyboard on that trigger (focusReturn.ts):
 * a click or the search shortcut, then Escape, gives focus back quietly;
 * Tab and Enter (or Space), then Escape, gives it back with the ring; the
 * next arrow or Tab brings the ring back. Shared by Chromium and WebKit.
 * WebKit doesn't Tab to buttons by default: the trigger is focused as Tab
 * would, then opened with Enter.
 */
const ringOn = (locator: Locator) =>
  locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
  });

/** As Tab would reach it: focus from the keyboard, with its ring */
const tabTo = async (page: Page, trigger: Locator) => {
  await trigger.focus();
  await page.keyboard.press('Shift');
};

export function focusRingSuite() {
  test.describe('the focus ring on a trigger an overlay gives focus back to', () => {
    test.use({ viewport: { height: 900, width: 1440 } });

    const searchButton = (page: Page) =>
      page.getByRole('banner').getByRole('button', { name: 'Search' });

    test('search: a click, then Escape: focus back, no ring', async ({
      page,
    }) => {
      await open(page);
      const button = searchButton(page);
      await button.click();
      await expect(field(page)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(searchDialog(page)).toBeHidden();
      await expect(button).toBeFocused();
      expect(await ringOn(button)).toBe(false);
      // the next arrow brings it back
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => ringOn(button)).toBe(true);
    });

    test('search: from the keyboard on the button, then Escape: the ring', async ({
      page,
    }) => {
      await open(page);
      const button = searchButton(page);
      await tabTo(page, button);
      await page.keyboard.press('Enter');
      await expect(field(page)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(searchDialog(page)).toBeHidden();
      await expect(button).toBeFocused();
      expect(await ringOn(button)).toBe(true);
    });

    test('search: the shortcut, then Escape: no ring; Tab shows the next one', async ({
      browserName,
      page,
    }) => {
      await open(page);
      const button = searchButton(page);
      // focus on the button first (a click earlier), so the dialog gives it back
      await button.click();
      await page.keyboard.press('Escape');
      await expect(button).toBeFocused();
      const shortcut = browserName === 'webkit' ? 'Meta+k' : 'Control+k';
      await page.keyboard.press(shortcut);
      await expect(field(page)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(searchDialog(page)).toBeHidden();
      const focused = page.locator(':focus');
      await expect(focused).toHaveCount(1);
      expect(await ringOn(focused)).toBe(false);
      if (browserName === 'chromium') {
        await page.keyboard.press('Tab');
        const next = page.locator(':focus');
        await expect(next).not.toHaveAttribute('aria-label', 'Search');
        expect(await ringOn(next)).toBe(true);
      }
    });

    test('a dialog: a click, then Escape: no ring; from the keyboard: the ring', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.goto('/settings/data');
      const trigger = page.getByRole('button', { name: 'Delete account' });
      const dialog = page.getByRole('dialog');

      await trigger.click();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      expect(await ringOn(trigger)).toBe(false);

      await tabTo(page, trigger);
      await page.keyboard.press('Enter');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      expect(await ringOn(trigger)).toBe(true);
    });
  });
}
