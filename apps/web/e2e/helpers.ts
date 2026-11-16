import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Loads a page and waits until it is hydrated: the header's username slot
 * is no longer the pre-hydration stand-in (`data-viewer-pending`: the server
 * never knows who is signed in), so click,
 * key and scroll handlers are attached. Use it before the first interaction:
 * a click on a server-rendered button before hydration does nothing.
 */
export const open = async (page: Page, path: string) => {
  await page.goto(path);
  await expect(page.locator('header [data-viewer-pending]')).toHaveCount(0);
  // text measured after this is in its own font, not the fallback's
  await page.evaluate(() => document.fonts.ready);
};

/**
 * Waits until React has hydrated this element (its props are attached), so
 * a click on it is handled: for a control in a section that streams and
 * hydrates after the header (`open` covers the header only). A web-first wait
 * for the state the click needs, not a click repeated until one lands.
 */
export const expectHydrated = (target: Locator) =>
  expect
    .poll(() =>
      target.evaluate((node) =>
        Object.keys(node).some((key) => key.startsWith('__reactProps$')),
      ),
    )
    .toBe(true);
