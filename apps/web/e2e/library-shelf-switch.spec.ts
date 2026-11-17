import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * A shelf switch on the stub, signed in as `alex`. The shelves are the
 * Library's layouts (the sidebar's `@aside/library`, the phone's chips in
 * `library/`), so a switch keeps them mounted: the same nodes, no
 * placeholder, and the active row's pill glides straight from the old shelf
 * to the new one, in the sidebar's own coordinates. The new shelf opens at
 * the top of the page, so with the page scrolled the sticky sidebar moves
 * on screen in the same frame; the pill must not take that move for its
 * own (it shot past the new row and back).
 */

const GHOSTS =
  '[data-placeholder="shelf-nav"], [data-placeholder="shelf-chips"]';

type Watch = {
  ghosts: string[];
  kept: Element | null;
  samples: number[];
};

/** The page has hydrated and loaded its layout animations */
async function ready(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-search-ready', '');
  await expect(
    page.locator('[data-slot="library-grid"] li').first(),
  ).toBeVisible();
  await page.waitForLoadState('networkidle');
}

/**
 * Keep the shelves' node, watch for their placeholder, and sample the
 * pill's top within the nav every frame
 */
const watch = (page: Page, slot: string) =>
  page.evaluate(
    ({ ghosts, slot }) => {
      const state = window as unknown as { watch: Watch };
      state.watch = {
        ghosts: [],
        kept: document.querySelector(`[data-slot="${slot}"]`),
        samples: [],
      };
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (
              node instanceof Element &&
              (node.matches(ghosts) || node.querySelector(ghosts))
            ) {
              state.watch.ghosts.push(node.outerHTML.slice(0, 80));
            }
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
      const tick = () => {
        const nav = document.querySelector(
          `[data-slot="${slot}"] nav[aria-label="Shelves"]`,
        );
        const pill = nav?.querySelector(
          'a[aria-current="page"] > span[aria-hidden="true"]',
        );
        if (nav && pill) {
          const top =
            pill.getBoundingClientRect().top - nav.getBoundingClientRect().top;
          state.watch.samples.push(Math.round(top * 10) / 10);
        }
        if (state.watch.samples.length < 90) {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    },
    { ghosts: GHOSTS, slot },
  );

const watched = (page: Page, slot: string) =>
  page.evaluate((slot) => {
    const { watch } = window as unknown as { watch: Watch };
    return {
      ghosts: watch.ghosts,
      kept:
        watch.kept !== null &&
        document.querySelector(`[data-slot="${slot}"]`) === watch.kept,
      samples: watch.samples,
    };
  }, slot);

/** The active row's top within the nav, with no pill animating */
const rowTop = (page: Page, name: RegExp) =>
  page
    .locator('[data-slot="shelf-nav"] nav')
    .getByRole('link', { name })
    .evaluate((link) => {
      const nav = link.closest('nav') as Element;
      return link.getBoundingClientRect().top - nav.getBoundingClientRect().top;
    });

/** Every sample lies between `from` and `to` and never turns back */
function expectStraight(samples: number[], from: number, to: number) {
  const low = Math.min(from, to) - 1;
  const high = Math.max(from, to) + 1;
  const direction = Math.sign(to - from);
  const wrong = samples.filter(
    (sample, index) =>
      sample < low ||
      sample > high ||
      (index > 0 && (sample - (samples[index - 1] as number)) * direction < -1),
  );
  expect(wrong, `${from} → ${to}: ${samples.join(' ')}`).toEqual([]);
  expect(samples.at(-1)).toBeCloseTo(to, 0);
}

const nav = (page: Page) =>
  page.locator('[data-slot="shelf-nav"] nav[aria-label="Shelves"]');

/** Click a shelf and wait for its pill to come to rest */
async function switchTo(page: Page, name: RegExp, path: string) {
  await nav(page).getByRole('link', { name }).click();
  await page.waitForURL(`**/u/alex/library/${path}`);
  await expect(nav(page).getByRole('link', { name })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.waitForFunction(
    () => document.querySelector('[data-pill]')?.getAnimations().length === 0,
  );
}

test.describe('switching shelves', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page.context(), 'alex');
  });

  test.describe('from the sidebar', () => {
    test.use({ viewport: { height: 900, width: 1440 } });

    test('keeps the sidebar and glides the pill straight to the new shelf, the page scrolled', async ({
      page,
    }) => {
      await page.goto('/u/alex/library/watching');
      await ready(page);
      // instant: a wheel's smooth scroll could still run after the switch
      await page.evaluate(() =>
        window.scrollTo({ behavior: 'instant', top: 800 }),
      );
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      const from = await rowTop(page, /Watching/);
      const to = await rowTop(page, /Finished/);
      await watch(page, 'shelf-nav');
      await switchTo(page, /Finished/, 'finished');
      await expect
        .poll(async () => (await watched(page, 'shelf-nav')).samples.length)
        .toBe(90);
      const { ghosts, kept, samples } = await watched(page, 'shelf-nav');
      expect(kept).toBe(true);
      expect(ghosts).toEqual([]);
      expectStraight(samples, from, to);
      // it glides: some frames sit between the two rows
      expect(samples.some((top) => top > from + 2 && top < to - 2)).toBe(true);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });

    test('Back and Forward move the pill without a glide', async ({ page }) => {
      await page.goto('/u/alex/library/watching');
      await ready(page);
      const watching = await rowTop(page, /Watching/);
      const finished = await rowTop(page, /Finished/);
      await switchTo(page, /Finished/, 'finished');
      await expect(
        page.locator('[data-slot="library-grid"] li').first(),
      ).toBeVisible();
      for (const [direction, path, from, to] of [
        ['back', 'watching', finished, watching],
        ['forward', 'finished', watching, finished],
      ] as const) {
        await watch(page, 'shelf-nav');
        await (direction === 'back' ? page.goBack() : page.goForward());
        await page.waitForURL(`**/u/alex/library/${path}`);
        await expect
          .poll(async () => (await watched(page, 'shelf-nav')).samples.length)
          .toBe(90);
        const { kept, samples } = await watched(page, 'shelf-nav');
        expect(kept).toBe(true);
        expect(
          samples.every(
            (top) => Math.abs(top - from) < 1 || Math.abs(top - to) < 1,
          ),
          `${direction}: ${samples.join(' ')}`,
        ).toBe(true);
        expect(samples.at(-1)).toBeCloseTo(to, 0);
      }
    });

    test('with reduced motion the pill jumps', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/u/alex/library/watching');
      await ready(page);
      const from = await rowTop(page, /Watching/);
      const to = await rowTop(page, /Finished/);
      await watch(page, 'shelf-nav');
      await switchTo(page, /Finished/, 'finished');
      await expect
        .poll(async () => (await watched(page, 'shelf-nav')).samples.length)
        .toBe(90);
      const { samples } = await watched(page, 'shelf-nav');
      expect(
        samples.every(
          (top) => Math.abs(top - from) < 1 || Math.abs(top - to) < 1,
        ),
        samples.join(' '),
      ).toBe(true);
    });
  });

  test('keeps the chips on a phone', async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto('/u/alex/library/watching');
    await ready(page);
    await watch(page, 'shelf-chips');
    await page
      .locator('[data-slot="shelf-chips"]')
      .getByRole('link', { name: /Watchlist/ })
      .click();
    await page.waitForURL('**/u/alex/library/watchlist');
    await expect(
      page.locator('[data-slot="library-grid"] li').first(),
    ).toBeVisible();
    const { ghosts, kept } = await watched(page, 'shelf-chips');
    expect(kept).toBe(true);
    expect(ghosts).toEqual([]);
  });
});
