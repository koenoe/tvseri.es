import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';
import { signInAs } from './helpers/session';
import { episodes, seasonLine, seasonSelect } from './helpers/showPage';
import { nextFrames } from './helpers/viewport';

/**
 * The show page's episodes section on a
 * production build with the stub API: the viewer's season after the shell's,
 * `?season`, the season line's tap and paint, the select's keyboard model
 * and the Focus move. Every test signs in to its own copy of the stub's
 * state (`signInAs`), so the writing tests mark freely and run in parallel.
 * They use The Long Run (900002, which alex hasn't started).
 */
const BEAR = '/136315/the-bear';
const LONG_RUN = '/900002/the-long-run';

test.beforeEach(async ({ context }) => {
  await signInAs(context, 'alex');
});

const segmentCentres = (page: Page) =>
  seasonLine(page)
    .locator('button')
    .evaluateAll((segments) =>
      segments.map((segment) => {
        const box = segment.getBoundingClientRect();
        return [box.left + box.width / 2, box.top + box.height / 2] as const;
      }),
    );

/**
 * The visible "Next up" line. Streamed content waits in a hidden template
 * until React swaps it in, and `getByText` also matches that copy: scope to
 * the page and take the first, so a mid-swap frame is never a strict-mode
 * violation.
 */
const nextUp = (page: Page, label: RegExp) =>
  page.getByTestId('route-show').getByText(label).first();

/**
 * The segments' centres once two reads 100 ms apart agree: images and streamed
 * parts can still move the line a moment after it is visible, and a drag
 * aimed at a moving target lands on the wrong segment.
 */
async function settledCentres(page: Page) {
  let previous = '';
  await expect
    .poll(
      async () => {
        const current = JSON.stringify(await segmentCentres(page));
        const same = current === previous;
        previous = current;
        return same;
      },
      { intervals: [100] },
    )
    .toBe(true);
  return segmentCentres(page);
}

async function openLongRun(page: Page) {
  await open(page, LONG_RUN);
  await expect(page.getByText('10 episodes').first()).toBeVisible();
  await expect(nextUp(page, /Next up · S01E01/)).toBeVisible();
  // The section is a streamed hole that hydrates after the header (what
  // `open` waits for): on a busy machine a key press can land before React
  // has its handlers. Wait for the live season select to be hydrated.
  await expect
    .poll(() =>
      seasonSelect(page).evaluate((element) =>
        Object.keys(element).some((key) => key.startsWith('__reactFiber')),
      ),
    )
    .toBe(true);
}

test('switches to the viewer’s Next-up season without a fetch', async ({
  page,
}) => {
  const seasonFetches: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/series/136315/season/3')) {
      seasonFetches.push(request.url());
    }
  });
  await page.goto(BEAR);
  await expect(seasonSelect(page)).toHaveText('Season 3');
  await expect(nextUp(page, /Next up · S03E\d{2}/)).toBeVisible();
  expect(seasonFetches).toEqual([]);
});

test('the viewer’s season and marks are in the HTML, before any JS', async ({
  page,
}) => {
  // No JS chunk loads: React's inline script alone reveals the viewer hole.
  await page.route('**/_next/static/chunks/**', (route) => route.abort());
  await page.goto(BEAR);
  await expect(seasonSelect(page)).toHaveText('Season 3');
  await expect(episodes(page).getByText('Next up · S03E05')).toBeVisible();
  await expect(episodes(page).getByText(/^4 of \d+ watched$/)).toBeVisible();
  await expect(
    episodes(page).getByText('Mark S03E05 watched', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    episodes(page).locator('[data-episode-tile="S01E01"]'),
  ).toHaveCount(0);
});

/**
 * `?season` (a shared season or episode link) is the server's season too: the
 * wall never paints the viewer's own season first and switches once the page
 * hydrates. The sheet's `&season` (`?history`) is the sheet's, not the wall's.
 */
for (const [query, season] of [
  ['?season=1', 'Season 1'],
  ['?season=2&episode=6', 'Season 2'],
  ['?history&season=1', 'Season 3'],
  ['?season=9', 'Season 3'],
] as const) {
  test(`${query}: the wall's season is in the HTML, before any JS`, async ({
    page,
  }) => {
    await page.route('**/_next/static/chunks/**', (route) => route.abort());
    await page.goto(`${BEAR}${query}`);
    // the viewer's wall, not the shell's signed-out one it replaces
    await expect(page.locator('[data-slot="episodes"]')).toBeVisible();
    await expect(seasonSelect(page)).toHaveText(season);
  });
}

test('the viewer’s season is in place before hydration, which never switches it', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  // Every frame (before it paints) and every DOM change: the heading's
  // text, and whether React has hydrated it.
  await page.addInitScript(() => {
    const log: string[] = [];
    (window as unknown as { __seasons: string[] }).__seasons = log;
    const read = () => {
      const trigger = Array.from(
        document.querySelectorAll<HTMLElement>(
          'section[aria-label="Episodes"] button',
        ),
      ).find((button) =>
        /^(Season \d+|Specials)$/.test(button.textContent?.trim() ?? ''),
      );
      if (!trigger) {
        return;
      }
      const hydrated = Object.keys(trigger).some((key) =>
        key.startsWith('__reactFiber'),
      );
      const entry = `${trigger.textContent?.trim()}${hydrated ? ' (hydrated)' : ''}`;
      if (log.at(-1) !== entry) {
        log.push(entry);
      }
    };
    new MutationObserver(read).observe(document, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    const frame = () => {
      read();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await open(page, BEAR);
  await page.waitForFunction(() =>
    (window as unknown as { __seasons: string[] }).__seasons.includes(
      'Season 3 (hydrated)',
    ),
  );
  // A few more frames: nothing switches after hydration.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let frames = 0;
        const frame = () => {
          frames += 1;
          if (frames === 10) {
            resolve();
          } else {
            requestAnimationFrame(frame);
          }
        };
        requestAnimationFrame(frame);
      }),
  );
  const seen = await page.evaluate(
    () => (window as unknown as { __seasons: string[] }).__seasons,
  );
  // The shell's signed-out season may paint while the hole is still on its
  // way (a slow API, a busy machine): it is replaced by the streamed HTML,
  // before hydration. Hydration itself never changes the season.
  expect(seen).toEqual(
    seen[0] === 'Season 1'
      ? ['Season 1', 'Season 3', 'Season 3 (hydrated)']
      : ['Season 3', 'Season 3 (hydrated)'],
  );
  // No error but the rig's own (the stub's local images are outside the
  // CSP): a hydration mismatch (in production React's minified #418/#423/
  // #425) would mean the server and client walls differ.
  expect(
    errors.filter(
      (text) => !/^Loading the image .* Content Security Policy/.test(text),
    ),
  ).toEqual([]);
});

test('?season wins over the viewer’s season', async ({ page }) => {
  await open(page, `${BEAR}?season=1`);
  await expect(seasonSelect(page)).toHaveText('Season 1');
  // on the page itself: the streamed copy waiting to be swapped in also
  // holds the line for a moment, outside the page's root and hidden
  await expect(
    page.getByTestId('route-show').getByText('8 episodes', { exact: true }),
  ).toBeVisible();
});

test('a tap on the season line toggles one episode', async ({ page }) => {
  await openLongRun(page);
  const segment = seasonLine(page).locator('button').nth(5);
  const saved = page.waitForResponse(
    (response) => response.request().headers()['next-action'] !== undefined,
  );
  await segment.click();
  await expect(page.getByText('1 of 10 watched')).toBeVisible();
  // A segment is inert while its own write is out (a tap then does
  // nothing, by design). The write settles after its response has been
  // read, a moment after the response arrives, longer on a busy machine,
  // and the page shows nothing for it: tap again only while the episode
  // is still marked, so a tap that landed is never repeated.
  await (await saved).finished();
  await expect(async () => {
    if (/Unmark$/.test((await segment.getAttribute('aria-label')) ?? '')) {
      await segment.click();
    }
    await expect(page.getByText('5h 25m', { exact: true })).toBeVisible({
      timeout: 1000,
    });
  }).toPass({ timeout: 10_000 });
});

test('a drag on the season line paints a run with one toast', async ({
  page,
}) => {
  await openLongRun(page);
  await seasonLine(page).scrollIntoViewIfNeeded();
  const centres = await settledCentres(page);
  const [fromX, y] = centres[5]!;
  const [toX] = centres[8]!;
  await page.mouse.move(fromX, y);
  await page.mouse.down();
  for (let step = 1; step <= 10; step += 1) {
    await page.mouse.move(fromX + ((toX - fromX) * step) / 10, y);
  }
  await expect(page.getByText('Mark E06–E09', { exact: true })).toBeVisible();
  await page.mouse.up();
  await expect(page.getByText('Marked S01E06–S01E09 · Just now')).toBeVisible();
  await expect(page.getByText('4 of 10 watched')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('5h 25m', { exact: true })).toBeVisible();
});

test('the season select works from the keyboard', async ({ page }) => {
  await openLongRun(page);
  const trigger = seasonSelect(page);
  await expect(trigger).toHaveText('Season 1');
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  const listbox = page.getByRole('listbox', { name: 'Seasons' });
  await expect(listbox).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const active = await trigger.getAttribute('aria-activedescendant');
  await expect(listbox.locator(`[id="${active}"]`)).toHaveAccessibleName(
    /^Season 3/,
  );
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveText('Season 3');
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/\?season=3$/);
  // Tab walks through the panel (Continue, "Go to season") and, once focus
  // leaves the select, closes it.
  await page.keyboard.press('ArrowDown');
  await expect(listbox).toBeVisible();
  for (let tab = 0; tab < 4 && (await listbox.isVisible()); tab += 1) {
    await page.keyboard.press('Tab');
  }
  expect(
    await page.evaluate(
      () => !document.activeElement?.closest('[role="listbox"], .static'),
    ),
  ).toBe(true);
  await expect(listbox).toBeHidden();
});

test('the open season popover holds the page still; closing frees it', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await openLongRun(page);
  const trigger = seasonSelect(page);
  await trigger.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await trigger.click();
  const listbox = page.getByRole('listbox', { name: 'Seasons' });
  await expect(listbox).toBeVisible();
  const overflow = () =>
    page.evaluate(() => document.documentElement.style.overflow);
  await expect.poll(overflow).toBe('hidden');
  const scrollY = () => page.evaluate(() => window.scrollY);
  const at = await scrollY();
  expect(at).toBeGreaterThan(0);
  await page.mouse.move(100, 450);
  await page.mouse.wheel(0, -300);
  await page.keyboard.press('PageDown');
  // a window where nothing may happen: the scroll stays locked
  await nextFrames(page);
  expect(await scrollY()).toBe(at);

  await page.keyboard.press('Escape');
  await expect(listbox).toBeHidden();
  expect(await overflow()).toBe('');
  await page.mouse.wheel(0, -300);
  await expect.poll(scrollY).toBeLessThan(at);
});

test('marking Next up moves Focus to the next episode', async ({ page }) => {
  await openLongRun(page);
  await page
    .getByRole('button', { name: /^Mark S01E01 watched, / })
    .first()
    .click();
  await expect(nextUp(page, /Next up · S01E02/)).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(nextUp(page, /Next up · S01E01/)).toBeVisible();
});
