import { expect, test } from '@playwright/test';

import { findOverflow, formatProblems } from './helpers/overflow';
import { signInAs } from './helpers/session';

/** Safari's text metrics: the heavy profile at a phone and the board's width */
for (const width of [390, 1440] as const) {
  test(`heavy profile holds its text in WebKit at ${width}px`, async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ height: width < 500 ? 844 : 900, width });
    await signInAs(context, 'marathonwatcher-2026');
    await page.goto('/u/marathonwatcher-2026');
    await expect(
      page.getByRole('heading', { name: 'Recently watched' }),
    ).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    const problems = await findOverflow(page);
    expect(problems, formatProblems(problems)).toEqual([]);
  });
}
