import { expect, type Page, test } from '@playwright/test';

import { setLibraryHint, signInAs, stubFault } from './helpers/session';

/**
 * Continue watching always ends in one state ("continue
 * watching is very slow and doesn't always load"): its content; nothing,
 * when the viewer truly has nothing in progress; or the failed row in the
 * space its placeholder held, with Try again. Never a held space that
 * closes on a failure, never a skeleton that waits forever. `kit` is
 * partway through The Bear (stub viewer), a member on this browser.
 */

const OVERVIEW = '/me/overview';
const EMPTY_OVERVIEW = {
  almostDone: { closest: null, items: [] },
  catchingUp: [],
  comingUp: [],
  outNow: [],
  paused: [],
  upNext: [],
};

/** A full server render of Home under load (a refresh, a reload) */
const PAGE_LOAD = 15_000;

const placeholder = (page: Page) =>
  page.locator('[data-placeholder="continue"]');
const row = (page: Page) => page.locator('[data-slot="continue"]');
const topPicks = (page: Page) =>
  page.getByRole('heading', { name: /^Top Picks/ });
const failed = (page: Page, title = 'Continue watching') =>
  page.getByRole('alert').filter({ hasText: `${title} didn’t load.` });
/**
 * Top Picks' title: where the page below the row starts, once the stream has
 * swapped the loaded row in. Its skeleton draws the same title (one heading
 * either way, as the loaded row waits in a hidden segment), and the swap
 * detaches it mid-measure: wait for the skeleton to be gone first.
 */
const below = async (page: Page) => {
  await expect(page.locator('[data-placeholder="top-picks"]')).toHaveCount(0);
  const title = topPicks(page);
  await expect(title).toHaveCount(1);
  return (await title.boundingBox())?.y ?? Number.NaN;
};

for (const viewport of [
  { height: 900, width: 1440 },
  { height: 844, width: 390 },
] as const) {
  test.describe(`at ${viewport.width}`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ context }) => {
      await signInAs(context, 'kit');
      await setLibraryHint(context, 'kit', [136315]);
    });

    test('a late answer: the pulsing placeholder, then the row; a failure keeps the space and heals on the next visit', async ({
      page,
    }) => {
      await stubFault('kit', {
        delayMs: 2500,
        includes: OVERVIEW,
        mode: 'slow',
        times: 1,
      });
      // not the load event: it comes after the stream, with the row
      await page.goto('/', { waitUntil: 'commit' });
      await expect(placeholder(page)).toBeVisible();
      await expect(placeholder(page).locator('.animate-ghost')).toHaveCount(1);
      const held = await below(page);
      // (the loaded row's height follows kit's lane; placeholders-home.spec.ts
      // checks the placeholder against a typical row)
      await expect(row(page)).toBeVisible();

      await stubFault('kit', { includes: OVERVIEW, mode: '500', times: 1 });
      await page.reload();
      await expect(failed(page)).toBeVisible();
      await expect(row(page)).toHaveCount(0);
      // the failed row takes the placeholder's space: nothing below moves
      expect(await below(page)).toBe(held);

      // no cache keeps the failure: the next visit reads again
      await page.reload();
      await expect(row(page)).toBeVisible();
    });

    test('Try again brings the row back after a failure', async ({ page }) => {
      await stubFault('kit', { includes: OVERVIEW, mode: '500', times: 1 });
      await page.goto('/');
      await expect(failed(page)).toBeVisible();
      // Try again refreshes the whole page in one transition: the row comes
      // back once every hole of the page has re-rendered on the server, a
      // page load's work. Right after hydration the page prefetches its links
      // (a dozen RSC renders) and the refresh would queue behind them: click
      // once they are done, and give the refresh a page load's time (on a
      // shared machine it ran up to 5s, the default for one assertion)
      await page.waitForLoadState('networkidle');
      await failed(page).getByRole('button', { name: 'Try again' }).click();
      await expect(row(page)).toBeVisible({ timeout: PAGE_LOAD });
      await expect(failed(page)).toHaveCount(0);
    });

    test('nothing in progress: no row and no held space', async ({ page }) => {
      await stubFault('kit', {
        body: EMPTY_OVERVIEW,
        includes: OVERVIEW,
        mode: 'answer',
      });
      await page.goto('/');
      await expect(topPicks(page)).toHaveCount(1);
      await expect(topPicks(page)).toBeVisible();
      await expect(row(page)).toHaveCount(0);
      await expect(placeholder(page)).toHaveCount(0);
      await expect(failed(page)).toHaveCount(0);
    });

    test('the profile read failing is a failed row, not a signed-out page', async ({
      page,
    }) => {
      await stubFault('kit', { mode: '500', path: '/me' });
      await page.goto('/');
      await expect(failed(page)).toBeVisible();
      await expect(placeholder(page)).toHaveCount(0);
    });

    test('Because you watched failing is its failed row', async ({ page }) => {
      await stubFault('kit', {
        includes: '/me/home/because-you-watched',
        mode: '500',
      });
      await page.goto('/');
      await expect(row(page)).toBeVisible();
      await expect(failed(page, 'Because you watched')).toBeVisible();
    });
  });
}

test('a read that hangs past the timeout ends in the failed row', async ({
  context,
  page,
}) => {
  test.setTimeout(60_000);
  await signInAs(context, 'kit');
  await setLibraryHint(context, 'kit', [136315]);
  await stubFault('kit', { includes: OVERVIEW, mode: 'hang' });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(placeholder(page)).toBeVisible();
  await expect(failed(page)).toBeVisible({ timeout: 20_000 });
});

/**
 * A new viewer's Get started read that answers something other than a
 * status (no `steps`) is a failed read: the slot's failed state, as for any
 * other failure of its reads, never a crash of the page.
 */
test('a broken Get started answer is the slot’s failed state', async ({
  context,
  page,
}) => {
  await signInAs(context, 'nina');
  await setLibraryHint(context, 'nina', []);
  await stubFault('nina', {
    body: { hidden: false },
    mode: 'answer',
    path: '/me/get-started',
  });
  await page.goto('/');
  await expect(failed(page)).toBeVisible({ timeout: PAGE_LOAD });
  await expect(page.locator('[data-slot="get-started"]')).toHaveCount(0);
  await expect(topPicks(page)).toBeVisible();
});

/**
 * The row's critical path with 500 ms on each of its reads (`/me`, Get
 * started, the overview): time from the navigation to the row, three loads.
 * Sequential reads would show as 1.5 s and more.
 */
test('time to the row with 500 ms per read @perf', async ({
  context,
  page,
}) => {
  test.setTimeout(90_000);
  await signInAs(context, 'kit');
  await setLibraryHint(context, 'kit', [136315]);
  for (const rule of [
    { mode: 'slow', path: '/me' },
    { includes: '/me/get-started', mode: 'slow' },
    { includes: OVERVIEW, mode: 'slow' },
  ] as const) {
    await stubFault('kit', { ...rule, delayMs: 500 });
  }
  // the moment the row is in the document (not Playwright's polling)
  await page.addInitScript(() => {
    new MutationObserver((_, observer) => {
      if (document.querySelector('[data-slot="continue"]')) {
        performance.mark('continue-shown');
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const times: number[] = [];
  for (let run = 0; run < 3; run++) {
    await page.goto('/');
    await expect(row(page)).toBeVisible({ timeout: 20_000 });
    times.push(
      await page.evaluate(() => {
        const entry = performance
          .getEntriesByType('mark')
          .find((mark) => mark.name === 'continue-shown');
        return Math.round(entry?.startTime ?? performance.now());
      }),
    );
  }
  console.log(`Continue watching shown at ${times.join(', ')} ms`);
});
