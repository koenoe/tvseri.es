import { expect, test } from '@playwright/test';

import { findOverflow, formatProblems } from './helpers/overflow';

/**
 * The privacy page: its own route (not the root `[id]`), static (served
 * from the prerendered shell), and its text holds on a phone
 * (`helpers/overflow.ts`).
 */

test('/privacy is a static page', async ({ request }) => {
  const response = await request.get('/privacy');
  expect(response.status()).toBe(200);
  expect(response.headers()['x-nextjs-cache'] ?? 'HIT').not.toBe('MISS');
  const html = await response.text();
  expect(html).toContain('What we store');
  expect(html).toContain('Take it or delete it');
});

for (const width of [390] as const) {
  test(`/privacy holds its text at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ height: width < 500 ? 844 : 900, width });
    await page.goto('/privacy');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Privacy' }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const problems = await findOverflow(page);
    expect(problems, formatProblems(problems)).toEqual([]);
  });
}
