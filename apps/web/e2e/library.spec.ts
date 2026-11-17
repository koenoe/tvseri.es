import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * The Library on the stub, signed in as
 * `alex`: the shell, shelves, sort, find, the A–Z jump, a visitor's view
 * and the keyboard. Read-only except where a test says so (each test has
 * its own stub namespace).
 */

const grid = (page: Page) => page.locator('[data-slot="library-grid"]');
const tiles = (page: Page) => grid(page).locator('ul > li');
// textContent, not innerText: a tile is `content-visibility: auto`, and its
// innerText reads empty until the browser's next frame after it lands
const tileTitles = (page: Page) =>
  tiles(page).locator('a span.truncate:first-child').allTextContents();

test.describe('the Library, yours', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page.context(), 'alex');
  });

  test('a shelf is instant on a hard load: header, toolbar and 24 ghosts', async ({
    baseURL,
    page,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto('/u/alex/library/watchlist');
        await expect(
          page.getByRole('heading', { level: 2, name: 'Watchlist' }),
        ).toBeVisible();
        await expect(
          page.getByText('Saved and not started.', { exact: false }),
        ).toBeVisible();
        await expect(
          page.locator('[data-placeholder="library-grid"] li'),
        ).toHaveCount(24);
      },
      { baseURL },
    );
    await expect(tiles(page).first()).toBeVisible();
  });

  test('the Library tab is instant from the overview', async ({ page }) => {
    await page.goto('/u/alex');
    await expect(page.getByRole('heading', { name: 'Up next' })).toBeVisible();
    await instant(page, async () => {
      await page
        .getByRole('navigation', { name: 'Profile' })
        .getByRole('link', { name: 'Library' })
        .click();
      await page.waitForURL('**/u/alex/library');
      await expect(
        page.getByRole('heading', { level: 2, name: 'Watching' }),
      ).toBeVisible();
    });
    await expect(tiles(page).first()).toBeVisible();
  });

  test('opens on Watching, with its shelves in the sidebar', async ({
    page,
  }) => {
    await page.goto('/u/alex/library');
    const nav = page
      .getByRole('complementary')
      .getByRole('navigation', { name: 'Shelves' });
    await expect(nav.getByRole('link', { name: /Watching/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(nav.getByRole('link', { name: /Hidden/ })).toBeVisible();
    await expect(tiles(page).first()).toBeVisible();
  });

  // Pins Motion's AnimatePresence behaviour the leave relies on (the
  // neighbours keep `layout` through the exit's commit, so they slide)
  test('a hidden tile leaves; its neighbours end in their new cells; Undo puts it back', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await page.goto('/u/alex/library/watching');
    await expect(tiles(page).nth(3)).toBeVisible();
    const before = await tileTitles(page);
    const cells = await Promise.all(
      [0, 1, 2].map((index) => tiles(page).nth(index).boundingBox()),
    );

    const first = tiles(page).first();
    await first.hover();
    await first.getByRole('button', { name: /^More actions for/ }).click();
    // the second tile slides (a transform) rather than jumping: watched from
    // the press until 30 frames after the first tile has left the grid (a
    // count of frames from the moment it matters, not 1.5s of the clock from
    // before the press, which a slow machine spent on the press itself)
    const slid = tiles(page)
      .nth(1)
      .evaluate(
        (tile, gone) =>
          new Promise<boolean>((resolve) => {
            const grid = tile.parentElement;
            const count = grid?.children.length ?? 0;
            let after = -1;
            const tick = () => {
              const { transform } = getComputedStyle(tile);
              if (
                transform !== 'none' &&
                !transform.includes('1, 0, 0, 1, 0, 0')
              ) {
                resolve(true);
                return;
              }
              if (after < 0 && (grid?.children.length ?? 0) < count) {
                after = 0;
              } else if (after >= 0) {
                after += 1;
              }
              if (after >= gone) {
                resolve(false);
              } else {
                requestAnimationFrame(tick);
              }
            };
            requestAnimationFrame(tick);
          }),
        30,
      );
    await page.getByRole('menuitem', { name: /Hide from in progress/ }).click();
    expect(await slid).toBe(true);

    await expect(tiles(page)).toHaveCount(before.length - 1);
    await expect(tiles(page).filter({ hasText: before[0] ?? '' })).toHaveCount(
      0,
    );
    // the second and third tiles slide into the first and second cells and
    // end there, with no transform left over
    for (const index of [0, 1]) {
      const tile = tiles(page).filter({ hasText: before[index + 1] ?? '' });
      await expect
        .poll(async () => {
          const box = await tile.boundingBox();
          const transform = await tile.evaluate(
            (node) => getComputedStyle(node).transform,
          );
          return {
            transform:
              transform === 'matrix(1, 0, 0, 1, 0, 0)' ? 'none' : transform,
            x: Math.round(box?.x ?? -1),
            y: Math.round(box?.y ?? -1),
          };
        })
        .toEqual({
          transform: 'none',
          x: Math.round(cells[index]?.x ?? 0),
          y: Math.round(cells[index]?.y ?? 0),
        });
    }

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(tiles(page)).toHaveCount(before.length);
    await expect.poll(() => tileTitles(page)).toEqual(before);
  });

  test('switches shelves from the sidebar, keeping the identity', async ({
    page,
  }) => {
    await page.goto('/u/alex/library/watching');
    await expect(tiles(page).first()).toBeVisible();
    await page
      .locator('[data-slot="profile-identity"]')
      .evaluate((node) => node.setAttribute('data-kept', ''));
    await page
      .getByRole('navigation', { name: 'Shelves' })
      .getByRole('link', { name: /Finished/ })
      .click();
    await page.waitForURL('**/u/alex/library/finished');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Finished' }),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="profile-identity"][data-kept]'),
    ).toHaveCount(1);
  });

  test('a sort change dims the old grid and puts the sort in the URL', async ({
    page,
  }) => {
    await page.goto('/u/alex/library/watchlist');
    await expect(tiles(page).first()).toBeVisible();
    const before = await tileTitles(page);
    await page.getByRole('button', { name: 'Sort: Newest added' }).click();
    await page.getByRole('menuitemradio', { name: 'Oldest added' }).click();
    await page.waitForURL('**/library/watchlist?sort=oldest');
    await expect(grid(page)).not.toHaveAttribute('aria-busy');
    await expect(
      page.getByRole('button', { name: 'Sort: Oldest added' }),
    ).toBeVisible();
    await expect.poll(() => tileTitles(page)).not.toEqual(before);
  });

  test('the sort menu works from the keyboard', async ({ page }) => {
    await page.goto('/u/alex/library/watchlist');
    const pill = page.getByRole('button', { name: 'Sort: Newest added' });
    await pill.focus();
    await page.keyboard.press('ArrowDown');
    await expect(
      page.getByRole('menuitemradio', { name: 'Newest added' }),
    ).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(
      page.getByRole('menuitemradio', { name: 'Oldest added' }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(pill).toBeFocused();
  });

  test('find narrows the shelf to a title prefix', async ({ page }) => {
    await page.goto('/u/alex/library/favourites');
    await expect(tiles(page).first()).toBeVisible();
    await page
      .getByRole('searchbox', { name: 'Find in Favourites' })
      .fill('sev');
    await page.waitForURL('**/library/favourites?q=sev');
    await expect(tiles(page)).toHaveCount(1);
    await expect(tiles(page).first()).toContainText('Severance');
  });

  test('A–Z shows the rail; a letter jumps and the row above loads the rest, holding the place', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await signInAs(page.context(), 'marathonwatcher-2026');
    await page.goto('/u/marathonwatcher-2026/library/finished?sort=az');
    const rail = page.getByRole('navigation', { name: 'Jump to a letter' });
    await expect(rail).toBeVisible();
    await rail.getByRole('link', { name: 'Jump to P' }).click();
    await page.waitForURL('**/library/finished?from=p&sort=az');
    const load = page.getByRole('button', { name: /· load$/ });
    await expect(load).toBeVisible();
    await expect(tiles(page).first()).toBeVisible();
    const anchorTitle = (await tileTitles(page))[0] ?? '';
    expect(anchorTitle).not.toBe('');
    // the first tile on screen, under the row: its top before and after
    const top = () =>
      page.evaluate(
        (title) =>
          [...document.querySelectorAll('[data-slot="library-grid"] ul > li')]
            .find((li) => li.textContent?.includes(title))
            ?.getBoundingClientRect().top ?? Number.NaN,
        anchorTitle,
      );
    // the jumped-to tiles ease the last fraction of a pixel into place over
    // ~100ms: measure the anchor once it rests (the same top a frame apart)
    const frame = () =>
      page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(resolve)),
      );
    let before = Number.NaN;
    await expect
      .poll(async () => {
        const first = await top();
        await frame();
        before = await top();
        return Math.abs(before - first);
      })
      .toBeLessThan(0.01);
    await load.click();
    await expect
      .poll(async () => (await tileTitles(page))[0])
      .not.toBe(anchorTitle);
    // the hook corrects late layout over its settle frames: the place it holds
    await expect
      .poll(async () => Math.abs((await top()) - before))
      .toBeLessThanOrEqual(2);
  });

  test('a junk shelf is the static 404', async ({ page }) => {
    const response = await page.goto('/u/alex/library/junk');
    expect(response?.status()).toBe(404);
  });
});

test.describe('someone else’s Library', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page.context(), 'alex');
  });

  test('opens on Favourites with relation pills and no Hidden', async ({
    page,
  }) => {
    await page.goto('/u/juno/library');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Favourites' }),
    ).toBeVisible();
    await expect(
      page.getByText('juno’s favourites. The green ones'),
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Shelves' }).getByText('Hidden'),
    ).toHaveCount(0);
    await expect(
      grid(page).getByText('New to you', { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^More actions for/ }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Select' })).toHaveCount(0);
  });

  test('New to you shows only shows new to you, and + saves one to yours', async ({
    page,
  }) => {
    await page.goto('/u/juno/library/favourites');
    await page.getByRole('button', { name: /^New to you/ }).click();
    await page.waitForURL('**/library/favourites?with=new');
    await expect(tiles(page).first()).toBeVisible();
    const pills = grid(page)
      .locator('[title]')
      .filter({ hasText: /^(New to you|You|On your)/ });
    await expect(pills.first()).toHaveText('New to you');
    const count = await tiles(page).count();
    await expect(
      grid(page).getByText('New to you', { exact: true }),
    ).toHaveCount(count);
    const add = grid(page)
      .getByRole('button', { name: /^Add .* to my watchlist$/ })
      .first();
    await add.click();
    await expect(
      grid(page)
        .getByRole('button', { name: /is on my watchlist$/ })
        .first(),
    ).toBeVisible();
  });

  test('their Hidden is a 404', async ({ page }) => {
    await page.goto('/u/juno/library/hidden');
    await expect(page.getByText('Page not found')).toBeVisible();
  });
});

test.describe('the Library on a phone', () => {
  test.use({ viewport: { height: 844, width: 390 } });

  test.beforeEach(async ({ page }) => {
    await signInAs(page.context(), 'alex');
  });

  test('switches shelves by chip, three tiles a row', async ({ page }) => {
    await page.goto('/u/alex/library/watching');
    const chips = page
      .locator('nav[aria-label="Shelves"]')
      .filter({ visible: true });
    await chips.getByRole('link', { name: /Watchlist/ }).click();
    await page.waitForURL('**/library/watchlist');
    await expect(tiles(page).nth(3)).toBeVisible();
    const [a, b, c, d] = await Promise.all(
      [0, 1, 2, 3].map((index) => tiles(page).nth(index).boundingBox()),
    );
    expect(a?.y).toBe(b?.y);
    expect(b?.y).toBe(c?.y);
    expect((d?.y ?? 0) > (a?.y ?? 0)).toBe(true);
  });
});
