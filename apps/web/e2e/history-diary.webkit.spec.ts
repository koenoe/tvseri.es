import { expect, test } from '@playwright/test';

import { loadRows, wheelFor5s } from './helpers/diary';
import { signInAs } from './helpers/session';

/**
 * Safari's half of History: the month header scrolls with the
 * page (inside a `content-visibility` section; no sticky bar under the
 * glass header), and "Newer" prepends a month without moving the day
 * you're reading (no CSS scroll anchoring in WebKit: the diary holds it
 * itself).
 */

const PATH = '/u/marathonwatcher-2026/history';

for (const width of [390, 1440] as const) {
  test(`the month header scrolls away and Newer holds the place in WebKit at ${width}px`, async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ height: width < 500 ? 844 : 900, width });
    await signInAs(context, 'marathonwatcher-2026');
    await page.goto(`${PATH}?month=2024-03`);
    const march = page.getByRole('region', { exact: true, name: 'March 2024' });
    await expect(march).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 2500));
    await expect
      .poll(async () =>
        Math.round((await march.locator('h3').boundingBox())?.y ?? 0),
      )
      .toBeLessThan(-1000);

    await page.evaluate(() => window.scrollTo(0, 0));
    const before = await page.evaluate(() => {
      const day = [...document.querySelectorAll('[data-diary-day]')].find(
        (element) => element.getBoundingClientRect().bottom > 0,
      );
      return {
        key: day?.querySelector('time')?.getAttribute('datetime') ?? '',
        top: day?.getBoundingClientRect().top ?? 0,
      };
    });
    await page.getByRole('button', { name: 'Newer: April 2024' }).click();
    await page.waitForURL(`**${PATH}?month=2024-04`);
    const after = await page.evaluate(
      (key) =>
        document
          .querySelector(`time[datetime="${key}"]`)
          ?.closest('[data-diary-day]')
          ?.getBoundingClientRect().top ?? 0,
      before.key,
    );
    expect(Math.abs(after - before.top)).toBeLessThanOrEqual(2);
  });
}

test.describe('History scroll in WebKit (§5.3) @perf', () => {
  test.setTimeout(480_000);
  test('2,000 rows scroll smoothly @scroll', async ({ context, page }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await signInAs(context, 'marathonwatcher-2026');
    await page.goto(PATH);
    await expect(page.locator('[data-diary-row]').first()).toBeVisible();
    const rows = await loadRows(page, 2000);
    const scroll = await wheelFor5s(page);
    console.log(
      `[perf] history webkit: ${JSON.stringify({ rows, ...scroll })}`,
    );
    expect(rows).toBeGreaterThanOrEqual(2000);
    expect(scroll.slowFrames).toBeLessThanOrEqual(2);
  });
});
