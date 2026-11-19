import { expect, test } from '@playwright/test';

import { VIEWPORTS } from './helpers/placeholders';
import { type StubViewer, signInAs } from './helpers/session';
import { fontsSettled, untilStable } from './helpers/viewport';

/**
 * The Plex placeholder takes the shape this browser last saw (`data-plex` on
 * <html>, from a versioned localStorage hint the card writes): with the hint
 * the hard load doesn't shift; without it the page still works.
 */

/** Each card state once, alternating the width */
const CASES: ReadonlyArray<readonly [StubViewer, string, 'desktop' | 'phone']> =
  [
    ['rae', 'on', 'desktop'],
    ['sam', 'wait', 'phone'],
    ['nina', 'none', 'desktop'],
  ];

for (const [viewer, state, size] of CASES) {
  test(`${viewer} (${state}) at ${VIEWPORTS[size].width}px: no shift once the hint is stored`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: VIEWPORTS[size] });
    await signInAs(context, viewer);
    const page = await context.newPage();
    await page.goto('/settings/connected-apps');
    await expect(page.locator('[data-slot="plex"]')).toBeVisible();
    // the card wrote the hint
    await expect
      .poll(() =>
        page.evaluate(() =>
          JSON.parse(localStorage.getItem('tvseries:plex-hint') ?? '{}'),
        ),
      )
      .toMatchObject({ s: state, u: viewer, v: 1 });

    await page.addInitScript(() => {
      const target = window as unknown as { __shift: number };
      target.__shift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };
          if (!shift.hadRecentInput) {
            target.__shift += shift.value;
          }
        }
      }).observe({ buffered: true, type: 'layout-shift' });
    });
    await page.reload();
    const card = page.locator('[data-slot="plex"]');
    await expect(card).toBeVisible();
    await fontsSettled(page);
    // the card and the page have stopped moving: a late shift is counted
    await untilStable(
      async () => [
        await card.boundingBox(),
        await page.evaluate(() => document.documentElement.scrollHeight),
      ],
      { message: 'the Plex card kept moving', quietMs: 500 },
    );
    expect(
      await page.evaluate(() => document.documentElement.dataset.plex),
    ).toBe(state);
    const shift = await page.evaluate(
      () => (window as unknown as { __shift: number }).__shift,
    );
    expect(shift).toBeLessThan(0.005);
    await context.close();
  });
}

test('without a hint the page still works (the not-connected card is reserved)', async ({
  context,
  page,
}) => {
  await signInAs(context, 'nina');
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await page.goto('/settings/connected-apps');
  await expect(page.locator('[data-slot="plex"]')).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Connected apps' }),
  ).toBeVisible();
});
