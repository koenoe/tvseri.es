import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';

/**
 * On a phone landing the header shrinks to the page's
 * name (with search and menu, on the page ground) once the title scrolls
 * away, scrolling either way. It is the site's own header, not a second bar.
 */
test.use({ viewport: { height: 844, width: 390 } });

const LANDINGS = [
  ['/genre/crime', 'Crime'],
  ['/theme/dystopia', 'Dystopia'],
  ['/network/netflix', 'Netflix'],
  ['/country/gb', 'United Kingdom'],
  ['/decade/2010s', '2010s'],
  ['/language/ja', '日本語'],
] as const;

const header = (page: Page) => page.locator('header');

const scrollTo = (page: Page, y: number) =>
  page.evaluate((top) => window.scrollTo(0, top), y);

for (const [path, name] of LANDINGS) {
  test(`${path} shows its name in the header once the title scrolls away`, async ({
    page,
  }) => {
    await open(page, path);
    await expect(header(page)).toHaveAttribute('data-header-named', 'false');
    await expect(header(page)).not.toContainText(name);

    await scrollTo(page, 700);
    await expect(header(page)).toHaveAttribute('data-header-named', 'true');
    await expect(header(page)).toContainText(name);
    await expect(
      header(page).getByRole('button', { name: 'Search' }),
    ).toBeVisible();
    await expect(
      header(page).getByRole('button', { name: 'Menu' }),
    ).toBeVisible();
    await expect(header(page).getByText('Sign in')).toBeHidden();
    // a bar at the top of the window, not the floating pill
    const box = await header(page).boundingBox();
    expect(box?.y).toBe(0);
    expect(box?.height).toBeGreaterThan(0);

    // scrolling up keeps the name bar instead of the pill
    await scrollTo(page, 500);
    await expect(header(page)).toHaveAttribute('data-header-named', 'true');
    await expect(header(page)).toContainText(name);

    await scrollTo(page, 0);
    await expect(header(page)).toHaveAttribute('data-header-named', 'false');
    await expect(header(page)).not.toContainText(name);
  });
}

test('the name bar is the phone header’s 64px bar @design', async ({
  page,
}) => {
  await open(page, '/genre/crime');
  await scrollTo(page, 700);
  await expect(header(page)).toHaveAttribute('data-header-named', 'true');
  expect((await header(page).boundingBox())?.height).toBe(64);
});

test('the name bar does not move the page', async ({ page }) => {
  await open(page, '/genre/crime');
  const shifts = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            total += (entry as PerformanceEntry & { value: number }).value;
          }
        }).observe({ type: 'layout-shift' });
        window.scrollTo(0, 700);
        setTimeout(() => {
          window.scrollTo(0, 0);
          setTimeout(() => resolve(total), 300);
        }, 500);
      }),
  );
  expect(shifts).toBe(0);
});

test('a page without a name keeps the logo and the pill', async ({ page }) => {
  await open(page, '/discover');
  await scrollTo(page, 900);
  await expect(header(page)).toHaveAttribute('data-header-named', 'false');
});

test('the name is gone after leaving the landing', async ({ page }) => {
  await open(page, '/genre/crime');
  await scrollTo(page, 700);
  await expect(header(page)).toHaveAttribute('data-header-named', 'true');
  await page.goto('/discover');
  await scrollTo(page, 900);
  await expect(header(page)).toHaveAttribute('data-header-named', 'false');
});
