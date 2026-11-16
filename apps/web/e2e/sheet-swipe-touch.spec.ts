import { type CDPSession, expect, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * The sheet swipe under a real touch (Chromium's touch emulation through
 * CDP, which scrolls and hands gestures over as a phone does): a list at
 * its top drags the sheet down, a scrolled list scrolls back up first.
 * WebKit has no touch input in Playwright: the iPhone itself is the check.
 */
test.use({ hasTouch: true, viewport: { height: 844, width: 390 } });

async function drag(
  cdp: CDPSession,
  from: Readonly<{ x: number; y: number }>,
  dy: number,
) {
  const point = (y: number) => [{ x: from.x, y }];
  await cdp.send('Input.dispatchTouchEvent', {
    touchPoints: point(from.y),
    type: 'touchStart',
  });
  for (let step = 1; step <= 20; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', {
      touchPoints: point(from.y + (dy * step) / 20),
      type: 'touchMove',
    });
  }
  await cdp.send('Input.dispatchTouchEvent', {
    touchPoints: [],
    type: 'touchEnd',
  });
}

test.beforeEach(async ({ context }) => {
  await signInAs(context, 'alex');
});

test('the watch history: a list at its top drags the sheet away', async ({
  page,
}) => {
  await page.goto('/136315/the-bear?history');
  const sheet = page.getByRole('dialog', { name: 'Watch history' });
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(400);
  const box = await sheet
    .getByRole('region', { name: 'Season 2' })
    .boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await drag(cdp, { x: (box?.x ?? 40) + 10, y: (box?.y ?? 300) + 10 }, 400);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the watch history: a scrolled list scrolls back up, the sheet stays', async ({
  page,
}) => {
  await page.goto('/136315/the-bear?history');
  const sheet = page.getByRole('dialog', { name: 'Watch history' });
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(400);
  const body = sheet.locator('.overflow-y-auto').first();
  await body.evaluate((node) => {
    node.scrollTop = 300;
  });
  const box = await sheet
    .getByRole('region', { name: 'Season 3' })
    .boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await drag(cdp, { x: (box?.x ?? 40) + 10, y: (box?.y ?? 300) + 10 }, 150);
  await page.waitForTimeout(700);
  await expect(sheet).toBeVisible();
  expect(await body.evaluate((node) => node.scrollTop)).toBeLessThan(300);
});
