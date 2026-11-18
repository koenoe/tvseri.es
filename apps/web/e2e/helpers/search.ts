import { expect, type Page } from '@playwright/test';

/** The search overlay, its field and its options. */
export const dialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Search' });

export const field = (page: Page) =>
  page.getByRole('combobox', { name: 'Search series and people' });

export const option = (page: Page, name: string | RegExp) =>
  dialog(page).getByRole('option', { name });

export const marked = (page: Page) =>
  dialog(page).locator('[role="option"][aria-selected="true"]');

/** Hydrated, and the overlay preloaded on idle (the launcher marks it). */
export async function open(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-search-ready', '');
}

/** Opens search from the header's button (every layout and browser has it). */
export async function openFromHeader(page: Page) {
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Search' })
    .click();
  await expect(field(page)).toBeFocused();
  // the panel grows out of the icon: measure it once the grow has ended
  await page.waitForFunction(() => {
    const surface = document.querySelector('dialog .remote-surface');
    return surface !== null && surface.getAnimations().length === 0;
  });
}

/**
 * Enter-ahead: Enter while “bryan cranston” is pending (the stub
 * answers after 1.2 s) opens its first result as soon as it lands.
 * `slowRender`: a busy server, where the person page's full (dynamic) render
 * is still out while its cached route and shell (the prefetch) answer at
 * once; the URL must change before that render lands.
 */
export async function enterAhead(
  page: Page,
  { slowRender = false }: Readonly<{ slowRender?: boolean }> = {},
) {
  // `slowRender`: the page's dynamic render is held until the shell has been
  // seen (not 8s of the clock against a 4s budget, which a slow machine
  // could miss either way)
  const held: Array<() => void> = [];
  if (slowRender) {
    await page.route('**/person/17419/bryan-cranston?_rsc=*', async (route) => {
      if (!route.request().headers()['next-router-prefetch']) {
        await new Promise<void>((resolve) => held.push(resolve));
      }
      await route.continue().catch(() => undefined);
    });
  }
  await open(page);
  await openFromHeader(page);
  await field(page).fill('bryan cranston');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/');

  // the answer, then the page's shell, while its render is still out
  await expect(page).toHaveURL('/person/17419/bryan-cranston');
  for (const release of held.splice(0)) {
    release();
  }
}
