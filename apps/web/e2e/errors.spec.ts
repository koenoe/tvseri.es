import { instant } from '@next/playwright';
import { expect, test } from '@playwright/test';

/**
 * The static 404 (ERFinal): its own shell, the search prefilled from the
 * URL, five trending posters (stub `/collection/trending`) and Pick one for
 * me; plus the favicon set and the manifest.
 */

test.describe('404', () => {
  test('is static and draws the still, search, posters and Pick one', async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        const response = await page.goto('/shows/breaking-bad');
        expect(response?.status()).toBe(404);
        await expect(page.getByText('Page not found')).toBeVisible();
        const posters = page
          .getByRole('region', { name: 'Or start something new' })
          .getByRole('link');
        await expect(posters).toHaveCount(5);
        await expect(posters.first()).toHaveAttribute(
          'href',
          '/225171/pluribus',
        );
        await expect(
          page.getByRole('button', { name: 'Pick one for me' }),
        ).toBeVisible();
      },
      { baseURL },
    );
    // the prefill is read from the URL after hydration
    await expect(page.getByRole('searchbox')).toHaveValue('breaking bad');
  });

  test('Pick one for me opens a trending show', async ({ page }) => {
    await page.goto('/abc');
    await page.getByRole('button', { name: 'Pick one for me' }).click();
    await expect(page).toHaveURL(/\/\d+\/[a-z-]+$/);
  });

  // Five 58px posters need 322px; at 360 the row ended 14px from
  // the screen edge
  test('the posters keep the 24px gutter on both sides at 360', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 780, width: 360 });
    await page.goto('/abc');
    const posters = page
      .getByRole('region', { name: 'Or start something new' })
      .locator('li');
    await expect(posters).toHaveCount(5);
    const right = await posters
      .last()
      .evaluate((item) => item.getBoundingClientRect().right);
    expect(Math.round(right)).toBeLessThanOrEqual(360 - 24);
  });

  test('the posters keep their place: no layout shift', async ({ page }) => {
    // Warm the font cache first: a first visit's font swap (shared
    // next/font fallback, CLS ≈ 0.016 at 1280 × 720) is not the page's.
    await page.goto('/abc');
    await page.evaluate(() => document.fonts.ready);
    await page.addInitScript(() => {
      const shifts: number[] = [];
      Object.assign(window, { shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          shifts.push((entry as unknown as { value: number }).value);
        }
      }).observe({ buffered: true, type: 'layout-shift' });
    });
    await page.reload();
    // wait for the posters themselves, not network idle: under a parallel
    // run the shared server's prefetches keep the network busy
    const posters = page
      .getByRole('region', { name: 'Or start something new' })
      .locator('img');
    await expect(posters).toHaveCount(5);
    await expect
      .poll(() =>
        posters.evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).complete),
        ),
      )
      .toBe(true);
    const cls = await page.evaluate(() =>
      (window as unknown as { shifts: number[] }).shifts.reduce(
        (sum, value) => sum + value,
        0,
      ),
    );
    expect(cls).toBeLessThan(0.01);
  });
});

test.describe('favicon set', () => {
  test('the head links the icon, favicon, apple icon and manifest', async ({
    page,
  }) => {
    await page.goto('/');
    const head = page.locator('head');
    await expect(
      head.locator('link[rel="icon"][type="image/svg+xml"]'),
    ).toHaveCount(1);
    await expect(
      head.locator('link[rel="icon"][href^="/favicon.ico"]'),
    ).toHaveCount(1);
    await expect(head.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'sizes',
      '180x180',
    );
    await expect(head.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/manifest.webmanifest',
    );
  });

  test('the files are served', async ({ request }) => {
    for (const [path, type] of [
      ['/favicon.ico', 'image/x-icon'],
      ['/icon.svg', 'image/svg+xml'],
      ['/apple-icon.png', 'image/png'],
    ] as const) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()['content-type'], path).toContain(type);
    }
    const manifest = await (await request.get('/manifest.webmanifest')).json();
    expect(manifest).toMatchObject({
      background_color: '#1c2223',
      name: 'tvseri.es',
      short_name: 'tvseri.es',
      theme_color: '#1c2223',
    });
  });
});
