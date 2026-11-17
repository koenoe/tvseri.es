import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { signInAs, signInShownAs } from './helpers/session';
import {
  fontsSettled,
  nextFrames,
  pageSettled,
  phoneScrollbars,
} from './helpers/viewport';

/**
 * `/u/{username}/stats/{year}`: public, one cached entry
 * per URL. A user and year render on their first visit and stay in the ISR
 * cache, so each test warms its URL first and then asserts that the year,
 * the sentence and the first section are in the static shell.
 */
// Years relative to today, so nothing turns red on 1 January. The stub has
// data for 2024 to 2026 (fixtures/stats), enough through 2027.
const THIS_YEAR = new Date().getUTCFullYear();
const LAST_YEAR = THIS_YEAR - 1;
const YEAR_BEFORE = THIS_YEAR - 2;
const PAGE = `/u/lena/stats/${LAST_YEAR}`;
const CARD_TYPE = 'image/jpeg';

/**
 * Visits a year until its own content is in the static shell (`instant()`
 * holds the page there): the first visit renders it and stores it. The
 * response says nothing about it (no `x-nextjs-cache` on a partly
 * prerendered route), so the shell itself is checked.
 *
 * In a tab of its own: releasing the lock re-renders the page it loaded,
 * which would abort the test's next navigation in the same tab.
 */
async function warm(page: Page, url: string, baseURL?: string) {
  const tab = await page.context().newPage();
  try {
    for (let attempt = 0; attempt < 20; attempt++) {
      let cached = false;
      await instant(
        tab,
        async () => {
          await tab.goto(url);
          cached = await tab
            .getByRole('heading', { name: 'The year in series' })
            .waitFor({ state: 'visible', timeout: 2000 })
            .then(() => true)
            .catch(() => false);
        },
        baseURL ? { baseURL } : undefined,
      );
      if (cached) {
        return;
      }
    }
    throw new Error(`${url} never reached the static shell`);
  } finally {
    await tab.close();
  }
}

/** The page has hydrated: its controls take input */
const hydrated = (page: Page) =>
  expect(page.locator('html')).toHaveAttribute('data-search-ready', '');

test.describe('stats', () => {
  for (const width of [390, 1440]) {
    test(`never scrolls sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ height: 900, width });
      await phoneScrollbars(page, width);
      await page.goto(PAGE);
      await expect(
        page.getByRole('heading', { name: 'The year in series' }),
      ).toBeVisible();
      const widths = () =>
        page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
      // every block streamed in and still: a width read while a section is
      // still its ghost (a loaded machine) measures the ghost
      await pageSettled(page);
      const { clientWidth, scrollWidth } = await widths();
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }

  test('is instant on a page load, signed out (the build seed)', async ({
    page,
    baseURL,
  }) => {
    // Only a prerendered URL has its year in the static shell; any other
    // user and year renders on its first visit (ISR), behind the skeleton.
    // The seed is `example` in the year before this one (page.tsx), which
    // the stub answers as the fixture user.
    const year = LAST_YEAR;
    await instant(
      page,
      async () => {
        await page.goto(`/u/example/stats/${year}`);
        await expect(
          page.getByRole('heading', { level: 1, name: String(year) }),
        ).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'The year in series' }),
        ).toBeVisible();
      },
      { baseURL },
    );
  });

  test('switches year from the sidebar instantly once cached', async ({
    baseURL,
    page,
  }) => {
    await warm(page, `/u/lena/stats/${YEAR_BEFORE}`, baseURL);
    await warm(page, PAGE, baseURL);
    await page.goto(PAGE);
    const sidebar = page.getByRole('complementary');
    const yearBefore = sidebar.getByRole('link', {
      name: new RegExp(`^${YEAR_BEFORE}`),
    });
    await expect(yearBefore).toBeVisible();
    await instant(page, async () => {
      await yearBefore.click();
      await page.waitForURL(
        (url) => url.pathname === `/u/lena/stats/${YEAR_BEFORE}`,
      );
      await expect(
        page.getByRole('link', { name: 'tvseri.es home' }),
      ).toBeVisible();
    });
    await expect(
      page.getByRole('heading', { level: 1, name: String(YEAR_BEFORE) }),
    ).toBeVisible();
  });

  // The sidebar and the phone head are the Stats layout's (above `[year]`):
  // a year switch keeps them mounted (no skeleton, the same nodes), the
  // clicked year is the selected one while the new year is still its
  // static shell, and the new year opens at the top of the page.
  for (const width of [1440, 390]) {
    test(`a year switch keeps the sidebar and selects the year at once at ${width}px`, async ({
      baseURL,
      page,
    }) => {
      await page.setViewportSize({ height: 900, width });
      await phoneScrollbars(page, width);
      await page.goto(PAGE);
      await hydrated(page);
      const name = width >= 1024 ? 'stats-aside' : 'stats-phone-head';
      const head = page.locator(`[data-slot="${name}"]`);
      const target = head.getByRole('link', {
        name: new RegExp(`^${YEAR_BEFORE}`),
      });
      const current = head.getByRole('link', {
        name: new RegExp(`^${LAST_YEAR}`),
      });
      await expect(current).toHaveAttribute('aria-current', 'page');
      await expect(target).toBeVisible();
      if (width >= 1024) {
        // the sticky sidebar, with the page scrolled
        await page.mouse.wheel(0, 800);
        await expect
          .poll(() => page.evaluate(() => window.scrollY))
          .toBeGreaterThan(0);
      }
      // The nodes before the switch, and any sidebar skeleton that appears
      await page.evaluate((slot) => {
        const state = window as unknown as {
          kept: Element[];
          ghosts: string[];
        };
        const root = document.querySelector(`[data-slot="${slot}"]`);
        const link = root?.querySelector('a[aria-current="page"]');
        state.kept = [root, link].filter((node): node is Element => !!node);
        state.ghosts = [];
        const ghost =
          '[data-placeholder="stats-aside"], [data-placeholder="stats-phone-head"]';
        new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.addedNodes) {
              if (
                node instanceof Element &&
                (node.matches(ghost) || node.querySelector(ghost))
              ) {
                state.ghosts.push(node.outerHTML.slice(0, 80));
              }
            }
          }
        }).observe(document.body, { childList: true, subtree: true });
      }, name);
      const keptNodes = () =>
        page.evaluate((slot) => {
          const { kept } = window as unknown as { kept: Element[] };
          return (
            kept.length === 2 &&
            kept.every((node) => node.isConnected) &&
            document.querySelector(`[data-slot="${slot}"]`) === kept[0]
          );
        }, name);
      await instant(
        page,
        async () => {
          await target.click();
          await page.waitForURL(
            (url) => url.pathname === `/u/lena/stats/${YEAR_BEFORE}`,
          );
          // selected from the static shell: no server render needed
          await expect(target).toHaveAttribute('aria-current', 'page');
          await expect(current).not.toHaveAttribute('aria-current');
          expect(await keptNodes()).toBe(true);
        },
        baseURL ? { baseURL } : undefined,
      );
      await expect(
        page.getByRole('heading', { level: 1, name: String(YEAR_BEFORE) }),
      ).toBeVisible();
      await expect(target).toHaveAttribute('aria-current', 'page');
      expect(await keptNodes()).toBe(true);
      expect(
        await page.evaluate(
          () => (window as unknown as { ghosts: string[] }).ghosts,
        ),
      ).toEqual([]);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });
  }

  // One Share for every width, beside the year's title: the icon circle on
  // a phone (on the title's row at 360), the pill on desktop; it opens the
  // phone's sheet or the desktop dialog.
  for (const width of [360, 390, 1440]) {
    test(`Share sits beside the year and opens its panel at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width });
      await phoneScrollbars(page, width);
      await page.goto(PAGE);
      await hydrated(page);
      const title = page.getByRole('heading', {
        level: 1,
        name: String(LAST_YEAR),
      });
      const share = page.getByRole('button', { name: `Share ${LAST_YEAR}` });
      await expect(share).toHaveCount(1);
      await fontsSettled(page);
      const [titleBox, shareBox] = await Promise.all([
        title.boundingBox(),
        share.boundingBox(),
      ]);
      const middle = (shareBox?.y ?? 0) + (shareBox?.height ?? 0) / 2;
      expect(middle).toBeGreaterThan(titleBox?.y ?? 0);
      expect(middle).toBeLessThan((titleBox?.y ?? 0) + (titleBox?.height ?? 0));
      expect(shareBox?.width).toBe(width < 768 ? 32 : shareBox?.width);
      await share.click();
      const panel = page.getByRole('dialog', {
        name: `lena’s ${LAST_YEAR}, as a card`,
      });
      await expect(panel).toBeVisible();
      // the dialog's overline; the sheet has none
      await expect(panel.getByText('Share', { exact: true })).toHaveCount(
        width < 768 ? 0 : 1,
      );
    });
  }

  test('no Share for a year in progress', async ({ page }) => {
    await page.goto(`/u/lena/stats/${THIS_YEAR}`);
    await expect(
      page.getByRole('heading', { level: 1, name: String(THIS_YEAR) }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Share / })).toHaveCount(0);
  });

  // The user lookup unavailable: the data-down page has the whole width,
  // with no sidebar or phone head beside it (the layout's grid steps aside)
  for (const width of [390, 1440]) {
    test(`a failed user lookup is the whole data-down page at ${width}px`, async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ height: 900, width });
      await page.goto(`/u/out-500-user/stats/${LAST_YEAR}`);
      await expect(
        page.getByText('Our series data is on a break.'),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('complementary')).toBeHidden();
      await expect(
        page.locator(
          '[data-slot="stats-aside"], [data-slot="stats-phone-head"], [data-placeholder="stats-aside"], [data-placeholder="stats-phone-head"]',
        ),
      ).toHaveCount(0);
      // the grid is out of the way: no gutter or column around the page
      const display = await page
        .locator('[data-stats-down]')
        .evaluate((node) => {
          let grid = node.parentElement;
          while (grid && !grid.classList.contains('group/stats')) {
            grid = grid.parentElement;
          }
          return grid ? getComputedStyle(grid).display : 'no grid';
        });
      expect(display).toBe('contents');
    });
  }

  test('serves the static 404 for malformed usernames and years, with no function', async ({
    request,
  }) => {
    for (const url of [
      `/u/n!na/stats/${LAST_YEAR}`,
      `/u/le!na/stats/${LAST_YEAR}`,
      '/u/lena/stats/20x5',
      '/u/lena/stats/1999',
      `/u/lena/stats/${LAST_YEAR}x/card`,
    ]) {
      expect((await request.get(url)).status(), url).toBe(404);
    }
  });

  test('shows the noindex 404 for a well-formed unknown user or year', async ({
    page,
  }) => {
    // The year renders in the page's Suspense child (a cached shell per URL),
    // so the not-found UI streams in after the shell; Next marks it noindex.
    for (const url of [
      `/u/nobody-here/stats/${LAST_YEAR}`,
      `/u/lena/stats/${THIS_YEAR + 5}`,
    ]) {
      await page.goto(url);
      await expect(
        page.locator('meta[name="robots"][content="noindex"]').first(),
      ).toBeAttached();
      await expect(
        page.getByRole('heading', { level: 1, name: /^\d{4}$/ }),
      ).toHaveCount(0);
    }
  });

  test('"Most hours" re-sorts the rows with a layout animation, not a jump', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await page.goto(PAGE);
    const rows = page.locator('#year-in-shows-rows [role="img"]');
    await rows.first().scrollIntoViewIfNeeded();
    await hydrated(page);
    // Per animation frame: how many rows moved since the frame before, and
    // whether any row is mid-flight (a transform: the layout animation's
    // FLIP). Watched from the press until 30 still frames after the first
    // move, so a slow press or a stalled frame is not the window's end
    const sample = () =>
      page.evaluate(
        () =>
          new Promise<Array<{ moved: number; flying: boolean }>>((resolve) => {
            const rows = () =>
              [
                ...document.querySelectorAll(
                  '#year-in-shows-rows [role="img"]',
                ),
              ].sort((a, b) =>
                (a.getAttribute('aria-label') ?? '').localeCompare(
                  b.getAttribute('aria-label') ?? '',
                ),
              );
            const top = () =>
              rows().map((row) => row.getBoundingClientRect().top);
            const frames: Array<{ moved: number; flying: boolean }> = [];
            let last = top();
            let still = -1;
            const tick = () => {
              const next = top();
              const moved = next.filter(
                (y, i) => Math.abs(y - (last[i] ?? y)) > 0.5,
              ).length;
              const flying = rows().some((row) => {
                const { transform } = getComputedStyle(row);
                return (
                  transform !== 'none' &&
                  transform !== 'matrix(1, 0, 0, 1, 0, 0)'
                );
              });
              frames.push({ flying, moved });
              last = next;
              if (moved > 0 || flying) {
                still = 0;
              } else if (still >= 0) {
                still += 1;
              }
              if (still >= 30 || frames.length > 2000) {
                resolve(frames);
              } else {
                requestAnimationFrame(tick);
              }
            };
            requestAnimationFrame(tick);
          }),
      );
    for (const label of ['Most hours', 'In order watched']) {
      const frames = sample();
      await page.getByRole('radio', { name: label }).first().click();
      // a jump moves the rows in one frame, with no row in flight; the spring
      // moves them over several (how many the machine paints: a CI runner
      // painted six, a stalled one two), each row on a transform meanwhile
      const recorded = await frames;
      const withMotion = recorded.filter((frame) => frame.moved > 0).length;
      const inFlight = recorded.some((frame) => frame.flying);
      expect(withMotion > 1 || inFlight, label).toBe(true);
    }
  });

  /**
   * Loads a year (nothing grows), switches to the year before, and returns
   * the delays of the first three week lines to grow.
   */
  async function growDelays(page: Page, baseURL: string | undefined) {
    await page.setViewportSize({ height: 900, width: 1440 });
    await warm(page, `/u/lena/stats/${YEAR_BEFORE}`, baseURL);
    await warm(page, PAGE, baseURL);
    // What the week lines animate (the numbers' cross-fade is a view
    // transition, which React does not start while Next's testing API, on in
    // this rig, wraps navigations; it is checked on a plain production build).
    // Every grow that starts is recorded as it starts, with its line's delay:
    // read later, a busy machine could find it already over (0.5s) or the
    // year still on its way.
    await page.addInitScript(() => {
      const grown: number[] = [];
      (window as unknown as { grown: number[] }).grown = grown;
      document.addEventListener(
        'animationstart',
        (event) => {
          const line = event.target;
          if (
            line instanceof SVGElement &&
            line.closest('section[aria-label$="at a glance"]') &&
            line.getBoundingClientRect().width > 0
          ) {
            grown.push(Number.parseFloat(line.style.animationDelay) || 0);
          }
        },
        true,
      );
    });
    const grown = () =>
      page.evaluate(() => (window as unknown as { grown: number[] }).grown);
    await page.goto(PAGE);
    await expect(
      page.getByRole('heading', { level: 1, name: String(LAST_YEAR) }),
    ).toBeVisible();
    await hydrated(page);
    // a page load: nothing grows (the grow starts with the page's first
    // frames, so a few of them are the window)
    await nextFrames(page, 10);
    expect(await grown()).toEqual([]);

    const sidebar = page.getByRole('complementary');
    await sidebar
      .getByRole('link', { name: new RegExp(`^${YEAR_BEFORE}`) })
      .click();
    await page.waitForURL(
      (url) => url.pathname === `/u/lena/stats/${YEAR_BEFORE}`,
    );
    // the first three lines to start
    await expect.poll(async () => (await grown()).length).toBeGreaterThan(2);
    return (await grown()).slice(0, 3).sort((a, b) => a - b);
  }

  test('a year switch grows the week lines one after the other, a page load does not', async ({
    baseURL,
    page,
  }) => {
    const [first = 0, second = 0, third = 0] = await growDelays(page, baseURL);
    expect(first).toBe(0);
    expect(second).toBeGreaterThan(first);
    expect(third - second).toBeCloseTo(second - first, 5);
  });

  test('@design the week lines start 8ms apart', async ({ baseURL, page }) => {
    expect(await growDelays(page, baseURL)).toEqual([0, 8, 16]);
  });

  test('sends another spelling of the username to the canonical URL', async ({
    page,
  }) => {
    // The redirect happens in the stream (a client-side replace). A string
    // (against baseURL) is compared with the address as it changes; a
    // predicate also waits for the canonical page's `load` event, which a
    // slow chunk can hold.
    await page.goto(`/u/LENA/stats/${LAST_YEAR}`, { waitUntil: 'commit' });
    await expect(page).toHaveURL(PAGE);
  });

  test('serves the share card for a finished year only, one URL per card', async ({
    request,
  }) => {
    const card = await request.get(`${PAGE}/card?format=story&theme=colour`);
    expect(card.status()).toBe(200);
    expect(card.headers()['content-type']).toBe(CARD_TYPE);
    // a year in progress, made-up query keys, a repeated key, another spelling
    expect(
      (await request.get(`/u/lena/stats/${THIS_YEAR}/card`)).status(),
    ).toBe(404);
    expect((await request.get(`${PAGE}/card?x=1`)).status()).toBe(400);
    expect(
      (await request.get(`${PAGE}/card?format=story&format=square`)).status(),
    ).toBe(400);
    expect(
      (await request.get(`/u/LENA/stats/${LAST_YEAR}/card`)).status(),
    ).toBe(404);
  });

  test('no View profile link on Stats, also on your own', async ({
    context,
    page,
  }) => {
    const link = page.getByRole('link', { name: 'View profile' });
    const year = page.getByRole('heading', {
      level: 1,
      name: String(LAST_YEAR),
    });
    await signInShownAs(context, 'alex', 'lena');
    await page.goto(PAGE);
    await expect(year).toBeVisible();
    await expect(link).toHaveCount(0);
  });

  test('signed in, the + is the viewer’s watchlist toggle', async ({
    context,
    page,
  }) => {
    // Its success path needs the stub API to know the auth stub's viewers
    // (`/me/library-ids`, the list routes); see the stats report.
    await signInAs(context, 'alex');
    await page.goto(PAGE);
    const popular = page.locator('section', {
      has: page.getByRole('heading', { name: 'Popular unwatched' }),
    });
    await expect(
      popular.getByRole('button', { name: /to watchlist$/ }).first(),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  test('signed in, the ⋯ on a Finished tile opens the viewer’s Remote', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await page.goto(PAGE);
    await page
      .getByRole('heading', { name: /^Finished in/ })
      .scrollIntoViewIfNeeded();
    const more = page
      .getByRole('button', { name: /^More actions for/ })
      .filter({ visible: true })
      .first();
    await more.click();
    await expect(
      page.getByRole('menu', { name: /^Actions for/ }),
    ).toBeVisible();
  });
});

// The tiles' "vs." lines ran
// across the dividers (800 beside the old sidebar, 360 on a phone) and the
// First and last cards cut their episode title to two letters. A "vs." line
// wraps under its change where the tile is narrower than both.
for (const width of [360, 390, 800, 1024] as const) {
  test(`tiles and First and last keep their text at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width });
    await phoneScrollbars(page, width);
    await page.goto(PAGE);
    const tiles = page.locator(
      '[data-slot="stats-tiles"] [role="group"] > div',
    );
    await expect(tiles.first()).toBeVisible();
    await fontsSettled(page);
    const spills = await tiles.evaluateAll((nodes) =>
      nodes.flatMap((tile) => {
        const box = tile.getBoundingClientRect();
        return Array.from(tile.querySelectorAll('span'))
          .filter((span) => span.childElementCount === 0)
          .map((span) => span.getBoundingClientRect())
          .filter((line) => line.width > 0 && line.right > box.right + 1)
          .map((line) => `${line.right - box.right}px past its tile`);
      }),
    );
    expect(spills).toEqual([]);
    const titles = page
      .getByRole('region', { name: 'First and last' })
      .locator('article .truncate');
    const count = await titles.count();
    // whole, or cut only after a readable stretch (a long title)
    for (let index = 0; index < count; index += 1) {
      const { cut, width } = await titles.nth(index).evaluate((node) => ({
        cut: node.scrollWidth > node.clientWidth + 1,
        width: node.clientWidth,
      }));
      expect(!cut || width >= 150).toBe(true);
    }
  });
}
