import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './session';

/**
 * The desktop ⋯ Remote (a popover, no dim) holds the page still while it is
 * open, as production's menu did: the wheel and the keys don't scroll the
 * page behind, nothing shifts sideways, and every close lets go. A dialog
 * opened from it keeps the page locked after the Remote closes under it.
 * Shared by the Chromium and WebKit specs.
 */
/** `toggles`: the ⋯-again and click-outside closes, the same in every engine */
export function remoteScrollLockSuite({ toggles = true } = {}) {
  test.describe('the desktop ⋯ locks the page while it is open', () => {
    test.use({ viewport: { height: 900, width: 1440 } });

    const SHOW = '/136315/the-bear';
    const trigger = (page: Page) =>
      page
        .getByRole('button', { name: 'More actions for The Bear' })
        .filter({ visible: true })
        .first();
    const scrollY = (page: Page) => page.evaluate(() => window.scrollY);
    const locked = (page: Page) =>
      page.evaluate(() => document.documentElement.style.overflow);
    /** A wheel over the page, away from the popover */
    const wheel = async (page: Page) => {
      await page.mouse.move(200, 700);
      await page.mouse.wheel(0, 500);
      // let a scroll, if any, land
      await page.waitForTimeout(300);
    };

    test('wheel and keys leave the page where it is; a close frees it', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.goto(SHOW);
      const button = trigger(page);
      await expect(button).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 120));
      await expect.poll(() => scrollY(page)).toBe(120);
      const before = await button.boundingBox();

      await button.click();
      await expect(page.getByRole('menu')).toBeVisible();
      await expect.poll(() => locked(page)).toBe('hidden');
      const open = await button.boundingBox();
      expect(open?.x).toBe(before?.x);
      expect(open?.y).toBe(before?.y);

      await wheel(page);
      expect(await scrollY(page)).toBe(120);
      for (const key of ['PageDown', 'End']) {
        await page.keyboard.press(key);
      }
      await page.waitForTimeout(300);
      expect(await scrollY(page)).toBe(120);
      await expect(page.getByRole('menu')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu')).toHaveCount(0);
      expect(await locked(page)).toBe('');
      await wheel(page);
      expect(await scrollY(page)).toBeGreaterThan(120);
    });

    if (toggles) {
      test('the ⋯ again, or a click outside, frees the page', async ({
        context,
        page,
      }) => {
        await signInAs(context, 'alex');
        await page.goto(SHOW);
        const button = trigger(page);
        await button.click();
        await expect.poll(() => locked(page)).toBe('hidden');
        await button.click();
        await expect(page.getByRole('menu')).toHaveCount(0);
        expect(await locked(page)).toBe('');

        await button.click();
        await expect.poll(() => locked(page)).toBe('hidden');
        await page.mouse.click(200, 700);
        await expect(page.getByRole('menu')).toHaveCount(0);
        expect(await locked(page)).toBe('');
      });
    }

    test('a dialog opened from it keeps the page locked until it closes', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.goto(SHOW);
      await trigger(page).click();
      await page.getByRole('menuitem', { name: /Edit watch history/ }).click();
      const sheet = page.getByRole('dialog', { name: 'Watch history' });
      await expect(sheet).toBeVisible();
      await expect(page.getByRole('menu')).toHaveCount(0);
      expect(await locked(page)).toBe('hidden');
      await page.keyboard.press('Escape');
      await expect(sheet).toHaveCount(0);
      await expect.poll(() => locked(page)).toBe('');
    });
  });
}
