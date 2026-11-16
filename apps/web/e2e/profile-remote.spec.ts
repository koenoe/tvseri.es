import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * The ⋯ Remote on every profile surface that has one, signed in as the stub's
 * `alex`: it opens (it once threw inside the strict LazyMotion wrapper and
 * took the block or the page down), and Hide / Keep leave the page as the
 * boards draw them.
 */

const SURFACES = [
  ['Up next', 'up-next'],
  ['Out now', 'b-out'],
  ['Catching up', 'b-catch'],
  ['From your circle', 'from-your-circle'],
  ['Favourites', 'favourites'],
] as const;

/** Console errors from Motion's strict mode, or anything that unmounts the page */
function watchForCrashes(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /LazyMotion|motion/i.test(message.text())
    ) {
      errors.push(message.text());
    }
  });
  return errors;
}

async function expectNoCrash(page: Page, errors: ReadonlyArray<string>) {
  await expect(page.getByText('Something broke')).toHaveCount(0);
  await expect(page.getByText(/didn.t load/)).toHaveCount(0);
  expect(errors).toEqual([]);
}

test.describe('the ⋯ Remote on the profile', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page.context(), 'alex');
  });

  for (const [name, id] of SURFACES) {
    test(`opens from ${name}`, async ({ page }) => {
      const errors = watchForCrashes(page);
      await page.goto('/u/alex');
      const block = page.locator(`section[aria-labelledby="${id}"]`);
      await block.scrollIntoViewIfNeeded();
      // Favourites show the ⋯ on the open slice only
      const more = block
        .getByRole('button', { name: /^More actions for/ })
        .filter({ visible: true })
        .first();
      await more.click();
      await expect(
        page.getByRole('menu', { name: /^Actions for/ }),
      ).toBeVisible();
      await expectNoCrash(page, errors);
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('menu', { name: /^Actions for/ }),
      ).toHaveCount(0);
    });
  }

  test('opens from a Watching tile (N E H), and Hide fades the tile out', async ({
    page,
  }) => {
    const errors = watchForCrashes(page);
    await page.goto('/u/alex/library/watching');
    const grid = page.locator('[data-slot="library-grid"]');
    const tiles = grid.locator('ul > li');
    await expect(tiles.first()).toBeVisible();
    const before = await tiles.count();
    const first = tiles.first();
    await first.hover();
    await first.getByRole('button', { name: /^More actions for/ }).click();
    await expect(
      page.getByRole('menu', { name: /^Actions for/ }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('menu', { name: /^Actions for/ })
        .locator('[aria-keyshortcuts]')
        .evaluateAll((keys) =>
          keys.map((key) => key.getAttribute('aria-keyshortcuts')),
        ),
    ).resolves.toEqual(['N', 'E', 'H']);
    await expectNoCrash(page, errors);

    // The tile fades and shrinks (0.2s, scale .96) before its cell leaves
    const seen = first.evaluate(
      (tile) =>
        new Promise<{ minOpacity: number }>((resolve) => {
          let minOpacity = 1;
          const start = performance.now();
          const tick = () => {
            minOpacity = Math.min(
              minOpacity,
              Number(getComputedStyle(tile).opacity),
            );
            if (performance.now() - start < 800) {
              requestAnimationFrame(tick);
            } else {
              resolve({ minOpacity });
            }
          };
          requestAnimationFrame(tick);
        }),
    );
    await page.getByRole('menuitem', { name: /Hide from in progress/ }).click();
    expect((await seen).minOpacity).toBeLessThan(1);
    await expect(tiles).toHaveCount(before - 1);
    await expectNoCrash(page, errors);
  });

  test('W on a Watchlist tile removes it when the Remote closes', async ({
    page,
  }) => {
    const errors = watchForCrashes(page);
    await page.goto('/u/alex/library/watchlist');
    const tiles = page.locator('[data-slot="library-grid"] ul > li');
    await expect(tiles.first()).toBeVisible();
    const title = await tiles
      .first()
      .locator('span.truncate')
      .first()
      .innerText();
    await tiles.first().hover();
    await tiles
      .first()
      .getByRole('button', { name: /^More actions for/ })
      .click();
    const menu = page.getByRole('menu', { name: /^Actions for/ });
    await menu.getByRole('menuitemcheckbox', { name: /watchlist/ }).click();
    // still there under the pointer while the Remote is open
    await expect(tiles.filter({ hasText: title })).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(tiles.filter({ hasText: title })).toHaveCount(0);
    await expectNoCrash(page, errors);
  });

  test('N on a Watching tile marks the episode after the tile’s', async ({
    page,
  }) => {
    const errors = watchForCrashes(page);
    await page.goto('/u/alex/library/watching');
    const tile = page
      .locator('[data-slot="library-grid"] ul > li')
      .filter({ hasText: 'Dexter: Resurrection' });
    // the code badge is the next episode
    await expect(tile.getByText('S01E08', { exact: true })).toBeVisible();
    await tile.hover();
    await tile.getByRole('button', { name: /^More actions for/ }).click();
    await page.getByRole('menuitem', { name: /Watched next episode/ }).click();
    await expect(page.getByText(/^Marked S01E08\b.*· Just now/)).toBeVisible({
      timeout: 15_000,
    });
    // the tile itself (the open Remote names the next episode too)
    await expect(
      tile.getByRole('link').getByText('S01E09', { exact: true }),
    ).toBeVisible();
    await expectNoCrash(page, errors);
  });

  test('H is latched on a Hidden tile and brings the show back', async ({
    page,
  }) => {
    const errors = watchForCrashes(page);
    await page.goto('/u/alex/library/hidden');
    const tiles = page.locator('[data-slot="library-grid"] ul > li');
    await expect(tiles.first()).toBeVisible();
    const before = await tiles.count();
    await tiles.first().hover();
    await tiles
      .first()
      .getByRole('button', { name: /^More actions for/ })
      .click();
    const h = page.getByRole('menuitemcheckbox', {
      name: /Hidden from in progress/,
    });
    await expect(h).toHaveAttribute('aria-checked', 'true');
    await h.click();
    await expect(tiles).toHaveCount(before - 1);
    await expectNoCrash(page, errors);
  });

  test('Keep and Hide answer a Paused row, which leaves at once', async ({
    page,
  }) => {
    const errors = watchForCrashes(page);
    await page.goto('/u/alex');
    const paused = page.locator('section[aria-labelledby="paused"]');
    await paused.scrollIntoViewIfNeeded();
    const keeps = paused.getByRole('button', { name: /^Keep / });
    await expect(keeps.first()).toBeVisible();
    const before = await keeps.count();
    expect(before).toBeGreaterThan(1);
    await keeps.first().click();
    await expect(keeps).toHaveCount(before - 1);
    await paused
      .getByRole('button', { name: /^Hide (?!all$)/ })
      .first()
      .click();
    await expect(keeps).toHaveCount(before - 2);
    await expectNoCrash(page, errors);
  });

  test('a double-click on a Paused Hide hides one series, with Undo', async ({
    page,
  }) => {
    await page.goto('/u/alex');
    const paused = page.locator('section[aria-labelledby="paused"]');
    await paused.scrollIntoViewIfNeeded();
    const hides = paused.getByRole('button', { name: /^Hide (?!all$)/ });
    await expect(hides.first()).toBeVisible();
    const before = await hides.count();
    expect(before).toBeGreaterThan(1);
    // the next row's Hide slides into the spot: the second click is no press
    await hides.first().dblclick();
    await expect(hides).toHaveCount(before - 1);
    const undo = page.getByRole('button', { name: 'Undo' });
    await expect(undo).toBeVisible();
    await undo.click();
    await expect(hides).toHaveCount(before);
  });
});
