import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { loadRows, wheelFor5s } from './helpers/diary';
import { afterRelease } from './helpers/instantRelease';
import { signInAs } from './helpers/session';
import { untilStable } from './helpers/viewport';

/**
 * History, the diary on a
 * production build with the stub's heavy profile: 6,000 dated episodes,
 * January 2024 to August 2026, 300 in March 2024, a 36-episode bulk day on
 * 14 Jun 2025, 600 undated.
 */

const HEAVY = 'marathonwatcher-2026';
const PATH = `/u/${HEAVY}/history`;

const diary = (page: Page) => page.locator('[data-diary]');
const month = (page: Page, name: string) =>
  page.getByRole('region', { exact: true, name });
const firstMonth = (page: Page) =>
  diary(page).locator('section[data-month]').first();
const jumpTo = (page: Page) => page.getByRole('complementary');
const clientWatchedReads = (page: Page) => {
  const reads: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/watched')) {
      reads.push(request.url());
    }
  });
  return reads;
};

/** The top of the first day row under the screen's top, to measure a prepend */
const firstVisibleDay = (page: Page) =>
  page.evaluate(() => {
    const day = [...document.querySelectorAll('[data-diary-day]')].find(
      (element) => element.getBoundingClientRect().bottom > 0,
    );
    return day
      ? {
          key: day.querySelector('time')?.getAttribute('datetime') ?? '',
          top: day.getBoundingClientRect().top,
        }
      : null;
  });

test.describe('History on a desktop', () => {
  test.use({ viewport: { height: 900, width: 1440 } });

  test('is instant on a hard load: the frame, header and placeholders are the shell', async ({
    baseURL,
    context,
    page,
  }) => {
    await signInAs(context, HEAVY);
    await instant(
      page,
      async () => {
        await page.goto(PATH);
        await expect(
          page.getByRole('heading', { level: 2, name: 'History' }),
        ).toBeVisible();
        await expect(
          page.getByText('Everything you watched, by day, newest first.', {
            exact: false,
          }),
        ).toBeVisible();
        await expect(
          page.locator('[data-placeholder="history-diary"]'),
        ).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Jump to' }),
        ).toBeVisible();
      },
      { baseURL },
    );
    await expect(firstMonth(page)).toBeVisible({ timeout: afterRelease() });
  });

  // The first paint is the server's HTML: read with JavaScript off, the
  // month the diary opens at is already white in Jump to (and its year
  // open), so nothing in the sidebar moves when the page hydrates
  test('Jump to has the diary’s first month white from the first paint', async ({
    browser,
  }) => {
    for (const path of [PATH, `${PATH}?month=2024-03`]) {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { height: 900, width: 1440 },
      });
      await signInAs(context, HEAVY);
      const page = await context.newPage();
      await page.goto(path);
      const opening = await page
        .locator('[data-slot="history-diary"] section[data-month]')
        .first()
        .getAttribute('data-month');
      expect(opening, path).toMatch(/^\d{4}-\d{2}$/);
      await expect(
        page.locator('[data-slot="history-jump"] a[aria-current="true"]'),
        path,
      ).toHaveAttribute('href', `${PATH}?month=${opening}`);
      await context.close();
    }
  });

  test('is instant from the overview’s tab', async ({ context, page }) => {
    await signInAs(context, HEAVY);
    await page.goto(`/u/${HEAVY}`);
    const tab = page
      .getByRole('navigation', { name: 'Profile' })
      .getByRole('link', { name: 'History' });
    await expect(tab).toBeVisible();
    await instant(page, async () => {
      await tab.click();
      await page.waitForURL(`**${PATH}`);
      await expect(
        page.getByRole('heading', { level: 2, name: 'History' }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Jump to' }),
      ).toBeVisible();
    });
  });

  test('Jump to March 2024 opens the list there, Newer prepends April with the place held, This week returns', async ({
    context,
    page,
  }) => {
    await signInAs(context, HEAVY);
    await page.goto(PATH);
    await expect(firstMonth(page)).toBeVisible();
    const newest = await firstMonth(page).getAttribute('data-month');
    const reads = clientWatchedReads(page);

    await jumpTo(page)
      .getByRole('button', { name: /^2024,/ })
      .click();
    await jumpTo(page)
      .getByRole('link', { name: /^March 2024, / })
      .click();
    await page.waitForURL(`**${PATH}?month=2024-03`);
    await expect(firstMonth(page)).toHaveAttribute('data-month', '2024-03');
    // the jump is the page's own read, not a client page read
    expect(reads).toEqual([]);
    await expect(
      jumpTo(page).getByRole('link', { name: /^March 2024, / }),
    ).toHaveAttribute('aria-current', 'true');
    // the header line counts the whole month, though only 100 are loaded
    await expect(month(page, 'March 2024')).toContainText(
      /^March 2024(29\d|300) episodes · \d+h/,
    );

    // the month header scrolls away with the page: no sticky bar under the
    // glass header. The wheel over the diary: over Jump to
    // it scrolls that list
    await page.mouse.move(900, 600);
    await page.mouse.wheel(0, 2000);
    await expect
      .poll(async () =>
        Math.round(
          (
            await month(page, 'March 2024')
              .getByRole('heading', { level: 3 })
              .boundingBox()
          )?.y ?? 0,
        ),
      )
      .toBeLessThan(-1000);

    await page.evaluate(() => window.scrollTo(0, 0));
    const newer = page.getByRole('button', { name: 'Newer: April 2024' });
    await expect(newer).toBeVisible();
    const before = await firstVisibleDay(page);
    await newer.click();
    await page.waitForURL(`**${PATH}?month=2024-04`);
    await expect(month(page, 'April 2024')).toBeAttached();
    const topOfDay = () =>
      page.evaluate((key) => {
        const time = document.querySelector(`time[datetime="${key}"]`);
        return time?.closest('[data-diary-day]')?.getBoundingClientRect().top;
      }, before?.key ?? '');
    // the anchor is held once the month above has been added and laid out
    await untilStable(topOfDay, { message: 'the day stops moving' });
    const after = await topOfDay();
    expect(Math.abs((after ?? 0) - (before?.top ?? 0))).toBeLessThanOrEqual(2);
    await expect(
      page.getByRole('button', { name: 'Newer: May 2024' }),
    ).toBeVisible();

    await jumpTo(page)
      .getByRole('link', { name: /This week/ })
      .click();
    await page.waitForURL(
      (url) => url.pathname === PATH && !url.searchParams.has('month'),
    );
    await expect(firstMonth(page)).toHaveAttribute('data-month', newest ?? '');
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(400);
  });

  test('Back restores the months loaded above and below', async ({
    context,
    page,
  }) => {
    await signInAs(context, HEAVY);
    await page.goto(`${PATH}?month=2024-03`);
    await page.getByRole('button', { name: 'Newer: April 2024' }).click();
    await page.waitForURL(`**${PATH}?month=2024-04`);
    const row = month(page, 'April 2024').getByRole('link').first();
    await row.click();
    await page.waitForURL((url) => !url.pathname.startsWith('/u/'));
    await page.goBack();
    await page.waitForURL(`**${PATH}?month=2024-04`);
    await expect(month(page, 'April 2024')).toBeAttached();
    await expect(month(page, 'March 2024')).toBeAttached();
    await expect(
      page.getByRole('button', { name: 'Newer: May 2024' }),
    ).toBeVisible();
  });

  test('a row of several episodes opens and folds; a bulk day says so', async ({
    context,
    page,
  }) => {
    await signInAs(context, HEAVY);
    await page.goto(`${PATH}?month=2025-06`);
    const june = month(page, 'June 2025');
    const bulk = june
      .locator('[data-diary-day]')
      .filter({ hasText: 'Marked in one go' })
      .first();
    await bulk.scrollIntoViewIfNeeded();
    const toggle = bulk.getByRole('button', { name: /^36 episodes of / });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const list = page.locator(`#${await toggle.getAttribute('aria-controls')}`);
    await expect(list.getByRole('link')).toHaveCount(36);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(list).toHaveCount(0);
  });

  test('with Motion’s layout chunk blocked, an opened row’s episodes are visible', async ({
    context,
    page,
  }) => {
    // the domMax chunk (drag and layout): the only one with `snapToCursor`
    let blocked = 0;
    await page.route('**/_next/static/chunks/*.js', async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes('snapToCursor')) {
        blocked += 1;
        await route.abort();
        return;
      }
      await route.fulfill({ body, response });
    });
    await signInAs(context, HEAVY);
    await page.goto(`${PATH}?month=2025-06`);
    const bulk = month(page, 'June 2025')
      .locator('[data-diary-day]')
      .filter({ hasText: 'Marked in one go' })
      .first();
    await bulk.scrollIntoViewIfNeeded();
    const toggle = bulk.getByRole('button', { name: /^36 episodes of / });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const list = page.locator(`#${await toggle.getAttribute('aria-controls')}`);
    await expect(list.getByRole('link')).toHaveCount(36);
    expect(blocked).toBeGreaterThan(0);
    // toBeVisible counts opacity 0 as visible: read what is drawn
    await expect
      .poll(() => list.evaluate((node) => getComputedStyle(node).opacity))
      .toBe('1');
    // The page keeps asking for chunks (prefetches) after the assertions:
    // let the handler finish the ones it is reading before the test closes
    // the page under it ("Response has been disposed")
    await page.unrouteAll({ behavior: 'wait' });
  });

  test('the owner’s rows carry the Remote', async ({ context, page }) => {
    await signInAs(context, HEAVY);
    await page.goto(PATH);
    await expect(
      page.getByRole('button', { name: /^More actions for / }).first(),
    ).toBeAttached();
    await expect(diary(page).getByText('New to you')).toHaveCount(0);
  });

  test('a visitor gets no ⋯ and no This week; New to you with + once per show', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await page.goto(PATH);
    await expect(firstMonth(page)).toBeVisible();
    await expect(
      page.getByText(`What ${HEAVY} watched, by day`, { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^More actions for / }),
    ).toHaveCount(0);
    await expect(
      jumpTo(page).getByRole('link', { name: /This week/ }),
    ).toHaveCount(0);
    const add = page
      .getByRole('button', { name: /^Add .+ to my watchlist$/ })
      .first();
    await expect(add).toBeVisible();
    const label = (await add.getAttribute('aria-label')) ?? '';
    const show = label.replace(/^Add /, '').replace(/ to my watchlist$/, '');
    // once per show, however many rows it has
    await expect(
      page.getByRole('button', { exact: true, name: label }),
    ).toHaveCount(1);
    await add.click();
    await expect(
      page.getByRole('button', { name: `${show} is on my watchlist` }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('the undated note only at the true end', async ({ context, page }) => {
    await signInAs(context, 'alex');
    await page.goto('/u/alex/history');
    await expect(
      page.getByText('Older months load as you scroll.'),
    ).toBeVisible();
    await expect(
      page.getByText('I don’t remember', { exact: false }),
    ).toHaveCount(0);
    await page.keyboard.press('End');
    await expect(
      page.getByText(
        /^\d+ episodes marked “I don’t remember” have no date: they count in your totals/,
      ),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText('Older months load as you scroll.'),
    ).toHaveCount(0);
  });

  test('day 0 brings a history in', async ({ context, page }) => {
    await signInAs(context, 'nina');
    await page.goto('/u/nina/history');
    await expect(page.getByText('Nothing watched yet')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Import a file' }),
    ).toHaveAttribute('href', '/settings/import');
    await expect(
      page.getByRole('link', { name: 'Connect Plex' }),
    ).toBeVisible();
  });
});

test.describe('History on a phone', () => {
  test.use({ viewport: { height: 844, width: 390 } });

  test('no header; Jump in the month header opens the sheet, a pick jumps and closes it', async ({
    context,
    page,
  }) => {
    await signInAs(context, HEAVY);
    await page.goto(PATH);
    await expect(firstMonth(page)).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'History' }),
    ).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Jump to' })).toBeHidden();
    await firstMonth(page).getByRole('button', { name: 'Jump' }).click();
    const sheet = page.getByRole('dialog', { name: 'Jump to' });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: /^2025,/ }).click();
    await sheet.getByRole('link', { name: /^June 2025,/ }).click();
    await page.waitForURL(`**${PATH}?month=2025-06`);
    await expect(sheet).toBeHidden();
    await expect(firstMonth(page)).toHaveAttribute('data-month', '2025-06');
  });
});

// A poster that fails to load (a TMDB hiccup) keeps its box, and its row
// the height the skipped estimate counts on.
test('a row whose poster fails to load keeps its height', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { height: 900, width: 1440 },
  });
  await signInAs(context, 'alex');
  const page = await context.newPage();
  await page.route('**/*', (route) =>
    route.request().resourceType() === 'image'
      ? route.abort()
      : route.fallback(),
  );
  await page.goto('/u/alex/history');
  const row = page.locator('[data-diary-row]').first();
  await expect(row).toBeVisible();
  const image = row.locator('img').first();
  // the request was refused: the image is broken, not still loading
  await expect
    .poll(() =>
      image.evaluate(
        (node: HTMLImageElement) => node.complete && node.naturalWidth === 0,
      ),
    )
    .toBe(true);
  // the poster's box keeps its 2:3 size, and the row its height around it
  const box = await row.evaluate((node) => {
    const poster = node.querySelector('img')?.parentElement;
    const grid = poster?.parentElement;
    if (!poster || !grid) {
      throw new Error('no poster in the row');
    }
    const style = getComputedStyle(grid);
    const { height, width } = poster.getBoundingClientRect();
    return {
      grid: grid.getBoundingClientRect().height,
      padded:
        height +
        Number.parseFloat(style.paddingTop) +
        Number.parseFloat(style.paddingBottom),
      ratio: Math.round((height / width) * 10) / 10,
      width,
    };
  });
  expect(box.width).toBeGreaterThan(0);
  expect(box.ratio).toBe(1.5);
  expect(box.grid).toBeCloseTo(box.padded, 0);
  await context.close();
});

// A day off screen is skipped (`content-visibility`) at an estimated
// height; if the estimate is off, everything under it moves the moment it
// renders (on a load, the months at the screen's foot). Each day below the
// fold is measured skipped, then on screen: the two are the same.
for (const viewport of [
  { height: 900, width: 1440 },
  { height: 844, width: 390 },
] as const) {
  test(`a skipped day is the height it renders at, at ${viewport.width}px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport });
    await signInAs(context, 'alex');
    const page = await context.newPage();
    await page.goto('/u/alex/history');
    await expect(firstMonth(page)).toBeVisible();
    await page.waitForLoadState('networkidle');
    const days = page.locator('[data-diary-day]');
    const heights = () =>
      days.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      );
    const fold = await days.evaluateAll(
      (elements) =>
        elements.filter(
          (element) =>
            element.getBoundingClientRect().top > window.innerHeight * 2,
        ).length,
    );
    expect(fold).toBeGreaterThan(0);
    const skipped = await heights();
    // every measured day on screen once, in one pass in the page (a
    // locator's scroll waits for a still element, and the list keeps
    // loading days below: on a slow machine the walk ran past the timeout)
    await days.evaluateAll(async (elements, count) => {
      const frames = () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      for (let index = 0; index < count; index += 4) {
        elements[index]?.scrollIntoView({ block: 'center' });
        await frames();
      }
      elements[count - 1]?.scrollIntoView({ block: 'center' });
      await frames();
    }, skipped.length);
    // a page loaded below adds days: the ones measured first are compared
    const rendered = (await heights()).slice(0, skipped.length);
    expect(rendered).toEqual(
      skipped.map((height) => expect.closeTo(height, 0)),
    );
    await context.close();
  });
}

// Timing-based: opt-in (`E2E_PERF=1`). The click timings with
// `STUB_API_DELAY_MS=500` (`--grep "@perf @timing"`), the scroll without a
// delay (`--grep "@perf @scroll"`), one worker so nothing else loads the machine.
// Opt-in because frame and long-task counts depend on the machine's load. The
// scroll runs in Chromium only: WebKit has no style-time metric and its frame
// gaps came out the same with and without the whole-page restyle.
test.describe('History performance @perf', () => {
  test.use({ viewport: { height: 900, width: 1440 } });
  test.setTimeout(480_000);

  test('tab click to placeholders and content @timing', async ({
    context,
    page,
  }) => {
    await signInAs(context, HEAVY);
    await page.goto(`/u/${HEAVY}`);
    const tab = page
      .getByRole('navigation', { name: 'Profile' })
      .getByRole('link', { name: 'History' });
    await expect(tab).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const w = window as unknown as { __t: Record<string, number> };
      w.__t = {};
      const seen = () => {
        const now = performance.now();
        if (
          !w.__t.placeholder &&
          document.querySelector('[data-placeholder="history-diary"]')
        ) {
          w.__t.placeholder = now;
        }
        if (
          !w.__t.content &&
          document.querySelector('[data-diary] [data-diary-row]')
        ) {
          w.__t.content = now;
        }
      };
      new MutationObserver(seen).observe(document.body, {
        childList: true,
        subtree: true,
      });
      document.addEventListener(
        'click',
        () => {
          w.__t.click = performance.now();
        },
        { capture: true, once: true },
      );
    });
    await tab.click();
    await expect(page.locator('[data-diary-row]').first()).toBeVisible();
    const timing = await page.evaluate(() => {
      const t = (window as unknown as { __t: Record<string, number> }).__t;
      return {
        content: Math.round((t.content ?? 0) - (t.click ?? 0)),
        placeholders: Math.round((t.placeholder ?? 0) - (t.click ?? 0)),
      };
    });
    console.log(`[perf] history click: ${JSON.stringify(timing)}`);
    expect(timing.placeholders).toBeLessThanOrEqual(50);
    expect(timing.content).toBeLessThanOrEqual(1100);
  });

  test('2,000 rows scroll smoothly @scroll', async ({ context, page }) => {
    await signInAs(context, HEAVY);
    await page.goto(PATH);
    await expect(page.locator('[data-diary-row]').first()).toBeVisible();
    const rows = await loadRows(page, 2000);
    const scroll = await wheelFor5s(page);
    console.log(
      `[perf] history chromium scroll: ${JSON.stringify({ rows, ...scroll })}`,
    );
    expect(rows).toBeGreaterThanOrEqual(2000);
    // About 150 ms of style work here; the `:root:has(header…)` that
    // restyled the whole page on every header turn took about 3,000 ms
    expect(scroll.recalcStyleMs).toBeLessThanOrEqual(750);
    expect(scroll.longTasks).toBe(0);
    expect(scroll.slowFrames).toBeLessThanOrEqual(8);
  });
});
