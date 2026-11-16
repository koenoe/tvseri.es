import { expect, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * A scroll lock (scrollLock.ts) takes a classic scroll bar away and the
 * viewport grows by its width: the toast, fixed to the viewport's right
 * edge, keeps its place (Toaster.tsx adds `--scroll-lock-gap`).
 */

// Playwright hides scroll bars in headless Chromium: show them (top level:
// it needs its own worker), and style the page's bar so it takes space even
// where the system draws overlay bars (macOS): a scroll lock then takes a
// real 15px gutter away.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const CLASSIC_BAR = 'html::-webkit-scrollbar{width:15px;background:#333}';

const HEIGHT = 900;

test('the toast does not move when a dialog locks and frees the page', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ height: HEIGHT, width: 1440 });
  await signInAs(context, 'alex');
  // before the app's scripts run: the lock measures the bar as it opens
  await page.addInitScript((css) => {
    new MutationObserver((_, observer) => {
      if (document.head) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.append(style);
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  }, CLASSIC_BAR);
  await page.goto('/136315/the-bear?history&season=3');
  const sheet = page.getByRole('dialog', { name: 'Watch history' });
  await sheet.getByRole('button', { name: 'Tap marks' }).click();
  await sheet
    .getByRole('region', { name: 'Season 3' })
    .locator('[data-chip="4"]')
    .click();
  const toast = page.locator('[data-sonner-toast]').first();
  await expect(toast).toBeVisible();
  await toast.hover();
  const right = async () => {
    const box = await toast.boundingBox();
    return Math.round((box?.x ?? 0) + (box?.width ?? 0));
  };
  const locked = await right();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await toast.hover();
  // the page's own scroll bar is back: the viewport is 15px narrower
  const gutter = await page.evaluate(
    () => window.innerWidth - document.documentElement.clientWidth,
  );
  expect(gutter).toBeGreaterThan(0);
  expect(await right()).toBe(locked);
  expect(locked).toBe(1440 - gutter - 24);
});
