import { expect, type Locator, type Page, test } from '@playwright/test';

import { formatAirWeekdayDate } from '../src/lib/format/airDate';
import { open } from './helpers';
import { CLS_LIMIT, readShifts, SHIFT_OBSERVER } from './helpers/parity';
import {
  answerStates,
  boxOf,
  idOfHref,
  STATES,
  type StateName,
} from './helpers/seriesStates';
import { signInAs } from './helpers/session';
import { untilStable } from './helpers/viewport';

/**
 * The Watchlist + Seen it control and the watchlist-only toggle
 *. Signed in, the control is a ghost at first paint and
 * streams in already in the viewer's state (the stub's read answers late,
 * `answerStates`), in the same box: the row is measured before and after,
 * and the page's layout shift stays at 0. Writes (server actions) are held,
 * so the presses stay optimistic, as on a slow network.
 */

const PLURIBUS = 225171;
const LATE = 4000;

/** What each state draws in the row */
const DRAWN: Readonly<Record<StateName, RegExp>> = {
  finished: /^Finished/,
  new: /^WatchlistSeen it$/,
  // the date comes from the app's own air-date formatter, so the order is decided in one place
  'up-to-date': new RegExp(`^Up to date${formatAirWeekdayDate('2026-11-19')}$`),
  watching: /^Continue S01E043 of 8$/,
  watchlist: /^On watchlist$/,
};

const SLIDE = '[aria-roledescription="slide"]:not([aria-hidden="true"])';

const holdWrites = (page: Page) =>
  page.route('**/*', (route) =>
    route.request().method() === 'POST' &&
    route.request().headers()['next-action']
      ? undefined
      : route.fallback(),
  );

/** The visible row's text: only the shown layer's (the hidden one is `invisible`) */
const shownText = (row: Locator) =>
  row.evaluate((node) =>
    [...node.querySelectorAll('[data-layer]')]
      .filter((layer) => !layer.className.includes('invisible'))
      .map((layer) => layer.textContent)
      .join(''),
  );

/**
 * The browser's own reads agree that `id` is on the watchlist: the library
 * ids and the show's marking state (the stub's profile and show fixtures
 * keep their own lists, so a test that answers the read says the same here,
 * as the API's routes do from one table)
 */
async function onWatchlistInTheTab(page: Page, id: number) {
  await page.route('**/api/me/library-ids', (route) =>
    route.fulfill({
      json: { favorites: [], inProgress: [], watched: [], watchlist: [id] },
    }),
  );
  await page.route(`**/api/me/series/${id}`, (route) =>
    route.fulfill({
      json: {
        fetchedAt: 1,
        seasons: [{ airedEpisodeCount: 8, episodeCount: 8, seasonNumber: 1 }],
        seriesId: id,
        status: {
          isFavorited: false,
          isWatchlisted: true,
          prefs: {
            firstTrackingAnsweredAt: null,
            neverAskBefore: false,
            skipped: [],
          },
        },
        watched: [],
      },
    }),
  );
}

/** The viewer's state for one show, late (the tab's reads agreeing) */
async function lateState(page: Page, kind: StateName, id: number) {
  if (kind === 'watchlist') {
    await onWatchlistInTheTab(page, id);
  }
  await answerStates('alex', { [id]: STATES[kind] }, LATE);
}

/**
 * Loads `path` signed in with the read answering `state` late: the ghost
 * first, then the state in the same box, with nothing moved
 */
async function ghostThenState(
  page: Page,
  path: string,
  scope: string,
  kind: StateName,
) {
  await page.addInitScript(SHIFT_OBSERVER);
  // the document streams until the read lands: look at it as it paints
  await page.goto(path, { waitUntil: 'commit' });
  const loading = page.locator(`${scope} [data-mark-control="loading"]`);
  await expect(loading).toBeVisible();
  // the page around it settled: hydrated (a logo that loaded first
  // releases its held box then), the pictures in
  await expect(page.locator('header [data-viewer-pending]')).toHaveCount(0);
  await page.waitForFunction(
    (css) =>
      [...document.querySelectorAll(`${css} img`)].every(
        (image) => (image as HTMLImageElement).complete,
      ),
    scope,
  );
  await untilStable(() => boxOf(page, `${scope} [data-mark-control]`), {
    message: 'the loading control stops moving',
  });
  await expect(loading).toBeVisible();
  const ghost = await boxOf(page, `${scope} [data-mark-control]`);
  // from here on only the control's arrival can move anything
  await page.evaluate(() => {
    (window as unknown as { __shifts: unknown[] }).__shifts.length = 0;
  });
  const row = page.locator(`${scope} [data-mark-control="${kind}"]`).last();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await untilStable(() => boxOf(page, `${scope} [data-mark-control]`), {
    message: 'the control stops moving',
  });
  expect(await boxOf(page, `${scope} [data-mark-control]`)).toEqual(ghost);
  expect(await shownText(row)).toMatch(DRAWN[kind]);
  const { cls, shifts } = await readShifts(page);
  expect(cls, shifts.join('\n')).toBeLessThan(CLS_LIMIT);
  return row;
}

for (const viewport of [
  { height: 900, width: 1440 },
  { height: 844, width: 390 },
]) {
  test.describe(`Home spotlight at ${viewport.width}`, () => {
    // the slideshow holds still (reduced motion): the first slide stays
    test.use({ reducedMotion: 'reduce', viewport });

    for (const kind of Object.keys(STATES) as StateName[]) {
      test(`${kind}: the ghost, then the state in the same box`, async ({
        context,
        page,
      }) => {
        await signInAs(context, 'alex');
        await lateState(page, kind, PLURIBUS);
        await ghostThenState(page, '/', SLIDE, kind);
      });
    }
  });
}

test.describe('Home spotlight presses', () => {
  test.use({ reducedMotion: 'reduce', viewport: { height: 900, width: 1440 } });

  test('+ Watchlist: On watchlist with the toast; Undo: the pair again', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await answerStates('alex', { [PLURIBUS]: STATES.new });
    await holdWrites(page);
    await open(page, '/');
    const row = page.locator(`${SLIDE} [data-mark-control]`).last();
    const before = await boxOf(page, `${SLIDE} [data-mark-control]`);
    await page
      .locator(SLIDE)
      .getByRole('button', { name: 'Add Pluribus to your watchlist' })
      .click();
    await expect(
      page.getByText('Added Pluribus to your watchlist'),
    ).toBeVisible();
    await expect(row).toHaveAttribute('data-mark-control', 'watchlist');
    expect(await shownText(row)).toBe('On watchlist');
    expect(await boxOf(page, `${SLIDE} [data-mark-control]`)).toEqual(before);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(row).toHaveAttribute('data-mark-control', 'new');
    expect(await shownText(row)).toBe('WatchlistSeen it');
  });

  test('Seen it: the one button, Finished or Up to date, with the toast', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await answerStates('alex', { [PLURIBUS]: STATES.new });
    await holdWrites(page);
    await open(page, '/');
    await page
      .locator(SLIDE)
      .getByRole('button', { name: 'Mark Pluribus as seen' })
      .click();
    await expect(page.getByText('Marked Pluribus as seen')).toBeVisible();
    const row = page.locator(`${SLIDE} [data-mark-control]`).last();
    await expect(row).toHaveAttribute(
      'data-mark-control',
      /^(finished|up-to-date)$/,
    );
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(row).toHaveAttribute('data-mark-control', 'new');
  });

  test('Continue opens the episode on the series page', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await answerStates('alex', { [PLURIBUS]: STATES.watching });
    await open(page, '/');
    // the stub answers no Pluribus season (404), so the series page then drops the
    // episode it can't find (`?season=1`): catch the navigation itself, not
    // a poll that can miss the moment on a loaded machine
    const opened = page.waitForURL(/\/225171\/pluribus\?season=1&episode=4$/);
    await page
      .locator(SLIDE)
      .getByRole('link', { name: /^Continue S01E04/ })
      .click();
    await opened;
  });
});

test.describe('the landing’s Start here tile', () => {
  test.use({ viewport: { height: 900, width: 1440 } });
  const TILE = '[data-slot="landing-hero"] article';

  for (const kind of ['watchlist', 'watching', 'finished'] as const) {
    test(`${kind}: the ghost, then the state in the same box`, async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.goto('/theme/dystopia');
      const href = await page.locator(`${TILE} a`).first().getAttribute('href');
      await lateState(page, kind, idOfHref(href));
      const tile = await boxOf(page, TILE);
      await ghostThenState(page, '/theme/dystopia', TILE, kind);
      expect(await boxOf(page, TILE)).toEqual(tile);
    });
  }
});

test.describe('the decade card', () => {
  test.use({ viewport: { height: 900, width: 1440 } });
  const CARD = '[data-slot="decade-card"]';

  for (const kind of ['new', 'up-to-date'] as const) {
    test(`${kind}: the ghost, then the state in the same box, right-aligned`, async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.goto('/decade/2010s');
      const id = idOfHref(
        await page.locator(`${CARD} a`).first().getAttribute('href'),
      );
      await answerStates('alex', { [id]: STATES[kind] }, LATE);
      const card = await boxOf(page, CARD);
      await ghostThenState(page, '/decade/2010s', CARD, kind);
      expect(await boxOf(page, CARD)).toEqual(card);
    });
  }
});

test.describe('a Premieres ticket', () => {
  test.use({ viewport: { height: 900, width: 1440 } });
  const TICKET = '[data-slot="premieres"] li:first-child article';

  test('the ghost, then On watchlist in the same 36px box; a press removes it with Undo', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await page.goto('/');
    const ticket = page.locator(TICKET);
    await ticket.scrollIntoViewIfNeeded();
    const href = await ticket.locator('a').first().getAttribute('href');
    await lateState(page, 'watchlist', idOfHref(href));
    await holdWrites(page);
    await page.goto('/', { waitUntil: 'commit' });
    await page.locator(TICKET).scrollIntoViewIfNeeded();
    const loading = page.locator(`${TICKET} [data-watchlist-toggle="loading"]`);
    await expect(loading).toBeVisible();
    const ghost = await boxOf(page, `${TICKET} [data-watchlist-toggle]`);
    expect(ghost?.height).toBe(36);
    const on = page.locator(`${TICKET} [data-watchlist-toggle="on"]`);
    await expect(on).toBeVisible({ timeout: 15_000 });
    expect(await boxOf(page, `${TICKET} [data-watchlist-toggle]`)).toEqual(
      ghost,
    );
    await expect(on.getByRole('button')).toHaveText('On watchlist');
    await on.getByRole('button').click();
    await expect(
      page.getByText(/^Removed .+ from your watchlist$/),
    ).toBeVisible();
    await expect(
      page.locator(`${TICKET} [data-watchlist-toggle="off"]`),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(on).toBeVisible();
  });
});
