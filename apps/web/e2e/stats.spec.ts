import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { signInAs, signInShownAs } from './helpers/session';
import { fontsSettled, pageSettled, phoneScrollbars } from './helpers/viewport';

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
  for (const width of [360]) {
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
  for (const width of [1440]) {
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
  for (const width of [390]) {
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
      expect(shareBox?.width).toBe(width < 768 ? 40 : shareBox?.width);
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
  for (const width of [390]) {
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

  // A phone shows the year in series a quarter at a time: the titles stay
  // put while the weeks scroll under them, a quarter switch jumps without
  // dragging, and a line out of view says where it is.
  test('a phone shows the year in series a quarter at a time', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 390 });
    await phoneScrollbars(page, 390);
    await page.goto(PAGE);
    const section = page.locator(
      'section[aria-labelledby="year-in-shows-title"]',
    );
    await section.scrollIntoViewIfNeeded();
    await hydrated(page);
    const quarters = section.getByRole('radiogroup', { name: 'Quarter' });
    const first = quarters.getByRole('radio', { name: 'Jan–Mar' });
    const last = quarters.getByRole('radio', { name: 'Oct–Dec' });
    // a finished year opens on its first quarter
    await expect(first).toHaveAttribute('aria-checked', 'true');
    const scroller = section.getByRole('region', { name: /week by week$/ });
    const scrollLeft = () => scroller.evaluate((el) => el.scrollLeft);
    await expect.poll(scrollLeft).toBe(0);
    const row = section.locator('#year-in-shows-rows [role="img"]').first();
    // every row keeps its full label, wherever the window is
    await expect(row).toHaveAttribute(
      'aria-label',
      /^.+: \d+ episodes?, .+ to .+, .+, (finished|still watching|caught up)$/,
    );
    const title = row.locator('span').first();
    const titleX = (await title.boundingBox())?.x;

    // the switch works from the keyboard (no dragging); the tapped quarter
    // stays lit all the way there, never the ones it scrolls past
    await last.focus();
    const lit = page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const seen: string[] = [];
          let frames = 0;
          const tick = () => {
            const on = document.querySelector(
              '[aria-label="Quarter"] [aria-checked="true"]',
            );
            seen.push(on?.textContent ?? '');
            frames += 1;
            if (frames < 90) {
              requestAnimationFrame(tick);
            } else {
              resolve(seen);
            }
          };
          requestAnimationFrame(tick);
        }),
    );
    await page.keyboard.press('Enter');
    await expect(last).toHaveAttribute('aria-checked', 'true');
    await expect(first).toHaveAttribute('aria-checked', 'false');
    const max = await scroller.evaluate(
      (el) => el.scrollWidth - el.clientWidth,
    );
    const target = await scroller.evaluate((el) => {
      const snaps = [...el.querySelectorAll('.snap-start')];
      return Number.parseFloat((snaps.at(-1) as HTMLElement).style.left);
    });
    // settled on the last quarter's first day (or as far as it goes)
    await expect
      .poll(async () => Math.abs((await scrollLeft()) - Math.min(target, max)))
      .toBeLessThan(1.5);
    const seen = await lit;
    expect(
      seen.filter((label) => label !== 'Jan–Mar' && label !== 'Oct–Dec'),
    ).toEqual([]);
    expect(seen.lastIndexOf('Jan–Mar')).toBeLessThan(seen.indexOf('Oct–Dec'));
    // the title stayed where it was
    expect((await title.boundingBox())?.x).toBe(titleX);
    // the first series, watched early in the year, points back to it
    const pointer = row.getByText(/^(Jan|Feb|Mar)/).first();
    await expect(pointer).toHaveCSS('opacity', '1');

    // the scroller takes focus and its arrow keys scroll it
    await scroller.focus();
    const before = await scrollLeft();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(scrollLeft).toBeLessThan(before);
  });

  // The rows "All N" and a re-sort bring in point the right way before any
  // scroll: the pointers are flagged by the scroll, and again on each render
  test('a phone points the rows it shows later the right way at once', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 390 });
    await phoneScrollbars(page, 390);
    await page.goto(PAGE);
    const section = page.locator(
      'section[aria-labelledby="year-in-shows-title"]',
    );
    await section.scrollIntoViewIfNeeded();
    await hydrated(page);
    const quarters = section.getByRole('radiogroup', { name: 'Quarter' });
    await quarters.getByRole('radio', { name: 'Oct–Dec' }).click();
    const scroller = section.getByRole('region', { name: /week by week$/ });
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
    await section.getByRole('button', { name: /^All \d+$/ }).click();
    await page.getByRole('radio', { name: 'Most hours' }).first().click();
    const wrong = await scroller.evaluate((el) => {
      const from = el.scrollLeft / 24;
      const to = (el.scrollLeft + el.clientWidth) / 24;
      const before = [...el.querySelectorAll<HTMLElement>('[data-before]')];
      const after = [...el.querySelectorAll<HTMLElement>('[data-after]')];
      return [
        ...before.filter(
          (pointer) =>
            pointer.hasAttribute('data-out') !==
            from >= Number(pointer.dataset.before),
        ),
        ...after.filter(
          (pointer) =>
            pointer.hasAttribute('data-out') !==
            to <= Number(pointer.dataset.after),
        ),
      ].length;
    });
    expect(wrong).toBe(0);
  });

  // The overview's window is a slider: dragging it (or pressing beside it)
  // scrubs the weeks, the quarter in view lights as with a swipe, and its
  // keys move it a week, or to the ends.
  test('a phone scrubs the year in series from its overview', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 390 });
    await phoneScrollbars(page, 390);
    await page.goto(PAGE);
    const section = page.locator(
      'section[aria-labelledby="year-in-shows-title"]',
    );
    await section.scrollIntoViewIfNeeded();
    await hydrated(page);
    const scroller = section.getByRole('region', { name: /week by week$/ });
    const scrollLeft = () => scroller.evaluate((el) => el.scrollLeft);
    const lit = section
      .getByRole('radiogroup', { name: 'Quarter' })
      .locator('[aria-checked="true"]');
    const slider = section.getByRole('slider', { name: 'Weeks in view' });
    await expect(lit).toHaveText('Jan–Mar');
    // the section is taller than the screen: the strip mid-screen, clear of
    // the fixed header
    await slider.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const strip = await slider.boundingBox();
    const frame = await slider.locator('span').boundingBox();
    if (!strip || !frame) {
      throw new Error('no overview');
    }
    const { max, track } = await scroller.evaluate((el) => ({
      max: el.scrollWidth - el.clientWidth,
      track: el.scrollWidth,
    }));
    const perPx = track / strip.width;
    const y = strip.y + strip.height / 2;

    // drag the window by 60px: the weeks follow in proportion
    const startX = frame.x + frame.width / 2;
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(startX + 60, y, { steps: 6 });
    await expect
      .poll(async () => Math.abs((await scrollLeft()) - 60 * perPx))
      .toBeLessThan(2);
    // on to the end of the strip: as far as it goes, the last quarter lit
    await page.mouse.move(strip.x + strip.width + 20, y, { steps: 6 });
    await expect.poll(scrollLeft).toBe(max);
    await expect(lit).toHaveText('Oct–Dec');
    await page.mouse.up();
    // snapping is back once it lets go
    await expect
      .poll(() => scroller.evaluate((el) => el.style.scrollSnapType))
      .toBe('');

    // a press beside the window brings it there, centred on the pointer
    const pressX = strip.x + strip.width * 0.3;
    await page.mouse.move(pressX, y);
    await page.mouse.down();
    const centred = (strip.width * 0.3 - frame.width / 2) * perPx;
    await expect
      .poll(async () => Math.abs((await scrollLeft()) - centred))
      .toBeLessThan(2);
    await expect(lit).toHaveText('Apr–Jun');
    await page.mouse.up();

    // the keyboard: Home, a week on, End
    await slider.focus();
    await page.keyboard.press('Home');
    await expect.poll(scrollLeft).toBe(0);
    await expect(lit).toHaveText('Jan–Mar');
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await expect(slider).toHaveAttribute(
      'aria-valuetext',
      /^January to (March|April)$/,
    );
    await page.keyboard.press('ArrowRight');
    await expect.poll(scrollLeft).toBe(24);
    await expect(slider).toHaveAttribute('aria-valuenow', '1');
    await page.keyboard.press('End');
    await expect.poll(scrollLeft).toBe(max);
    await expect(lit).toHaveText('Oct–Dec');
    await expect(slider).toHaveAttribute(
      'aria-valuemax',
      String(Math.ceil(max / 24)),
    );
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

// A show that reached Finished in the year with nothing of it dated in the
// year (the stub's The Traitors: its seasons watched the year before) has
// no episodes or runtime in the year: its tile leaves both out rather than
// claiming "0 episodes · 0m"; the other tiles keep theirs.
for (const width of [390] as const) {
  test(`a Finished tile with nothing in the year shows no zeros at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width });
    // the stub's 2026 (raw2026), whatever year it is now
    await page.goto('/u/lena/stats/2026');
    const section = page.getByRole('region', { name: 'Finished in 2026' });
    const tileOf = (title: string) =>
      section.getByRole('link', { name: title }).filter({ visible: true });
    const cardOf = (title: string) =>
      width < 768
        ? tileOf(title)
        : section
            .locator('[data-open="true"]')
            .filter({ has: page.getByRole('link', { name: title }) });
    // Another tile keeps its runtime (the accordion opens on the newest)
    await tileOf('Invincible').scrollIntoViewIfNeeded();
    await expect(cardOf('Invincible')).toContainText('7h 8m');
    if (width >= 768) {
      await expect(cardOf('Invincible')).toContainText('S01, 7 episodes');
    }
    // Focusing a slice opens it and shows its facts
    await tileOf('The Traitors').focus();
    const card = cardOf('The Traitors');
    await expect(card.getByText('Finished Sep 20')).toBeVisible();
    await expect(card).not.toContainText(/\b0 episodes|\b0m\b/);
  });
}

// The tiles' "vs." lines ran across the dividers on a phone and the First
// and last cards cut their episode title to two letters. A "vs." line
// wraps under its change where the tile is narrower than both.
for (const width of [360] as const) {
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
