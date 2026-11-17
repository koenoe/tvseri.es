import { expect, type Locator, type Page, test } from '@playwright/test';

import { open } from './helpers';
import { historyScrollSuite } from './helpers/historyScrollSuite';
import { signInAs } from './helpers/session';

/**
 * A link to another page opens it at the top, wherever the last page was
 * scrolled to; Back returns to the place you left (`NavigationTracker`).
 * Next alone left the Settings hero scrolled off: it brings only the new
 * page segment into view, and only when its top isn't already on screen.
 */

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

/** Scrolls the window to `y` and waits until it is there */
async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await expect.poll(() => scrollY(page)).toBe(y);
}

/**
 * Scrolls `link` into view, then on until the window is at least `offset`
 * down with the link still on screen.
 */
async function scrollWith(page: Page, link: Locator, offset: number) {
  await link.scrollIntoViewIfNeeded();
  const y = await link.evaluate((element, min) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    // the link 100px under the top edge, clear of the header
    return Math.max(min, Math.round(top - 100));
  }, offset);
  await scrollTo(page, y);
  await expect(link).toBeInViewport();
}

/**
 * Follows `link` to `path`; expects the new page at the top for a while.
 * Returns where the window was at the press (Playwright may scroll the link
 * clear of the floating header first): the place Back returns to.
 */
async function followToTop(page: Page, link: Locator, path: RegExp) {
  await page.evaluate(() => {
    window.addEventListener(
      'click',
      () => {
        document.documentElement.dataset.pressY = String(
          Math.round(window.scrollY),
        );
      },
      { capture: true, once: true },
    );
  });
  await link.click();
  const pressed = Number(
    await page.evaluate(() => document.documentElement.dataset.pressY),
  );
  await page.waitForURL(path);
  await expect.poll(() => scrollY(page)).toBe(0);
  // no late commit scrolls it again (a slot or a streamed section)
  await page.waitForTimeout(1000);
  expect(await scrollY(page)).toBe(0);
  return pressed;
}

/** Back returns to `y` (within a few px: images and fonts settle) */
async function backTo(page: Page, path: RegExp, y: number) {
  await page.goBack();
  await page.waitForURL(path);
  await expect
    .poll(async () => Math.abs((await scrollY(page)) - y))
    .toBeLessThanOrEqual(4);
}

test.describe('a new page opens at the top', () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, 'alex');
  });

  test('profile → Settings opens on the Settings hero, from a little or a long way down', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await open(page, '/u/alex/history');
    const settings = page.locator('main a[href="/settings/profile"]').first();

    // a little: Next judged the settings section (under the hero) visible
    await scrollWith(page, settings, 150);
    const near = await followToTop(page, settings, /\/settings\/profile$/);
    // the hero: @handle, the layout's own top above the section
    await expect(
      page.getByRole('heading', { level: 1, name: '@alex' }),
    ).toBeInViewport();
    await backTo(page, /\/u\/alex\/history$/, near);

    // a long way: the shorter page clamped the offset to its own bottom
    await scrollWith(page, settings, 2500);
    const far = await followToTop(page, settings, /\/settings\/profile$/);
    await backTo(page, /\/u\/alex\/history$/, far);
  });

  test('show → person, and Back', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await open(page, '/136315/the-bear');
    const person = page.locator('main a[href^="/person/"]').first();
    await scrollWith(page, person, 600);
    const y = await followToTop(page, person, /\/person\//);
    await backTo(page, /\/136315\/the-bear$/, y);
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { height: 844, width: 390 } });

    test('Discover → a landing, and Back', async ({ page }) => {
      await open(page, '/discover');
      const landing = page.locator('main a[href^="/genre/"]').first();
      await scrollWith(page, landing, 900);
      const y = await followToTop(page, landing, /\/genre\//);
      await backTo(page, /\/discover$/, y);
    });

    test('a profile tab opens at the top, and Back returns to the last tab’s place', async ({
      page,
    }) => {
      await open(page, '/u/alex/history');
      const tabs = page.getByRole('navigation', { name: 'Profile' });
      const library = tabs.getByRole('link', { name: 'Library' });
      await scrollWith(page, library, 200);
      const y = await followToTop(page, library, /\/u\/alex\/library$/);
      await backTo(page, /\/u\/alex\/history$/, y);
    });
  });
});

for (const [width, height] of [
  [390, 844],
  [1440, 900],
] as const) {
  historyScrollSuite(width, height);
}
