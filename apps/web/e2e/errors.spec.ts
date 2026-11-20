import { instant } from '@next/playwright';
import { expect, test } from '@playwright/test';

import { afterRelease } from './helpers/instantRelease';
import { clientSize, pageLine, phoneScrollbars } from './helpers/viewport';

/**
 * The static 404: its own shell, the search prefilled from the
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
    await expect(page.getByRole('searchbox')).toHaveValue('breaking bad', {
      timeout: afterRelease(),
    });
  });

  test('Pick one for me opens a trending show', async ({ page }) => {
    await page.goto('/abc');
    await page.getByRole('button', { name: 'Pick one for me' }).click();
    await expect(page).toHaveURL(/\/\d+\/[a-z-]+$/);
  });

  // Five 58px posters need 322px; at 360 the row ended 14px from
  // the screen edge
  test('the posters keep the page gutter on both sides at 360', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 780, width: 360 });
    await phoneScrollbars(page, 360);
    await page.goto('/abc');
    const posters = page
      .getByRole('region', { name: 'Or start something new' })
      .locator('li');
    await expect(posters).toHaveCount(5);
    const right = await posters
      .last()
      .evaluate((item) => item.getBoundingClientRect().right);
    // the right gutter mirrors the left one: the page line
    const [room, line] = await Promise.all([clientSize(page), pageLine(page)]);
    expect(right).toBeLessThanOrEqual(room.width - line + 0.5);
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
