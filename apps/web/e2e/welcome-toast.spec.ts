import { expect, test } from '@playwright/test';

import { WELCOME_COOKIE_NAME } from '../src/auth/cookies';

/**
 * The first sign-in's welcome (AU Final states, “3 · first sign-in”): the
 * callback sets the cookie, the page says welcome once, after it has loaded
 * (shown at hydration, its time ran out over a slow page's skeletons).
 */

test.describe('welcome toast', () => {
  for (const width of [1440, 390, 375, 360]) {
    test(`shows once the page has loaded, whole, at ${width}`, async ({
      baseURL,
      context,
      page,
    }) => {
      await page.setViewportSize({ height: 844, width });
      await context.addCookies([
        { name: WELCOME_COOKIE_NAME, url: baseURL ?? '', value: '1' },
      ]);
      const loaded = page.waitForEvent('load');
      await page.goto('/', { waitUntil: 'commit' });
      const title = page.getByText('Welcome', { exact: true });
      await loaded;
      await expect(title).toBeVisible();
      // Not truncated: the title's text fits its line
      expect(
        await title.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      const button = page.getByRole('button', { name: 'Pick a username' });
      await expect(button).toBeVisible();
      expect(
        await button.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);

      // Once: the next page says nothing
      await page.reload();
      await page.waitForLoadState('load');
      await expect(title).toHaveCount(0);
    });
  }

  test('waits for a page that is still loading', async ({
    baseURL,
    context,
    page,
  }) => {
    await context.addCookies([
      { name: WELCOME_COOKIE_NAME, url: baseURL ?? '', value: '1' },
    ]);
    // Hold one image of the first page: the document's load waits for it
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let holding = false;
    await page.route(
      /\.(png|jpe?g|webp|avif)(\?|$)|\/_next\/image/,
      async (route) => {
        if (!holding) {
          holding = true;
          await held;
        }
        await route.continue();
      },
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => holding).toBe(true);
    await page.waitForTimeout(1000);
    await expect(page.getByText('Welcome', { exact: true })).toHaveCount(0);

    release();
    await expect(page.getByText('Welcome', { exact: true })).toBeVisible();
  });
});
