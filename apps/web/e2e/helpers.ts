import { expect, type Page } from '@playwright/test';

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
};
