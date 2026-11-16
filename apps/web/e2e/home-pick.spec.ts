import { expect, type Page, test } from '@playwright/test';

import { answerStates, boxOf, idOfHref, STATES } from './helpers/seriesStates';
import { signInAs } from './helpers/session';
import { TOP_RATED } from './stub-api/fixtures/__top-rated.ts';

/**
 * Pick one for me's Watchlist: the shared watchlist-only toggle with the
 * page's read. A ghost at first paint, the viewer's state streamed in the
 * same box (the stub's read answers late), and a pick drawn by a roll takes
 * its state from the same read at once, with no ghost.
 */

const LATE = 4000;

const PICK = '[data-slot="pick-one"]';

/** The shows the deck's cards open (the first is the pick) */
const deckIds = async (page: Page) => {
  const hrefs = await page
    .locator(`${PICK} [aria-hidden="true"] a[href]`)
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  return hrefs.map(idOfHref);
};

/** The tab's library read answers with these lists */
const routeLibrary = (
  page: Page,
  lists: Readonly<{ inProgress?: number[]; watched?: number[] }>,
) =>
  page.route('**/api/me/library-ids', (route) =>
    route.fulfill({
      json: {
        favorites: [],
        inProgress: lists.inProgress ?? [],
        watched: lists.watched ?? [],
        watchlist: [],
      },
    }),
  );

test.describe('Pick one for me', () => {
  test.use({ viewport: { height: 900, width: 1440 } });
  const TOGGLE = `${PICK} [data-watchlist-toggle]`;

  test('the ghost, then the streamed state; a rolled pick draws its own at once', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await page.goto('/');
    const section = page.locator(PICK);
    await section.scrollIntoViewIfNeeded();
    // the deck's cards link to their shows; the first is the first pick
    const hrefs = await section
      .locator('a[href]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    const ids = [...new Set(hrefs.map(idOfHref))];
    const [first, ...rest] = ids;
    expect(rest.length).toBeGreaterThan(0);
    // the first pick is new to alex, every other card on the watchlist
    await answerStates(
      'alex',
      {
        [first as number]: STATES.new,
        ...Object.fromEntries(rest.map((id) => [id, STATES.watchlist])),
      },
      LATE,
    );
    // the tab's own library read agrees (as in `onWatchlistInTheTab`)
    await page.route('**/api/me/library-ids', (route) =>
      route.fulfill({
        json: { favorites: [], inProgress: [], watched: [], watchlist: rest },
      }),
    );
    await page.goto('/', { waitUntil: 'commit' });
    await page.locator(PICK).scrollIntoViewIfNeeded();
    const loading = page.locator(`${PICK} [data-watchlist-toggle="loading"]`);
    await expect(loading).toBeVisible();
    const ghost = await boxOf(page, TOGGLE);
    const off = page.locator(`${PICK} [data-watchlist-toggle="off"]`);
    await expect(off).toBeVisible({ timeout: 15_000 });
    expect(await boxOf(page, TOGGLE)).toEqual(ghost);
    await expect(off.getByRole('button')).toHaveText('Watchlist');
    // a roll lands on a card the read put on the watchlist
    await page.getByRole('button', { name: 'Roll again' }).click();
    const on = page.locator(`${PICK} [data-watchlist-toggle="on"]`);
    await expect(on).toBeVisible();
    await expect(on.getByRole('button')).toHaveText('On watchlist');
    await expect(loading).toHaveCount(0);
  });
});

/**
 * A signed-in viewer is dealt only shows new to them: never one they have
 * started, finished or are up to date with (their library's in progress
 * and watched), refilled from the day's reserve; rolls land on dealt cards
 * only. One new show left: no Roll again; none: no block.
 */
test.describe('Pick one for me deals new shows', () => {
  test.use({ viewport: { height: 900, width: 1440 } });
  const TITLE = `${PICK} h3 a`;

  const daySeven = async (page: Page) => {
    await page.goto('/');
    await page.locator(PICK).scrollIntoViewIfNeeded();
    const seven = await deckIds(page);
    expect(seven).toHaveLength(7);
    return seven;
  };

  test('started and finished shows are never dealt, after rolls too', async ({
    context,
    page,
  }) => {
    const seven = await daySeven(page);
    const started = [seven[0], seven[3]] as number[];
    const finished = [seven[5]] as number[];
    const seen = new Set([...started, ...finished]);
    await signInAs(context, 'alex');
    await routeLibrary(page, { inProgress: started, watched: finished });
    await page.goto('/');
    const section = page.locator(PICK);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    const dealt = await deckIds(page);
    expect(dealt).toHaveLength(7);
    expect(dealt.filter((id) => seen.has(id))).toEqual([]);
    // the rest of the day's seven stay, in order, the reserve fills in
    expect(dealt.slice(0, 4)).toEqual(seven.filter((id) => !seen.has(id)));
    const title = page.locator(TITLE);
    const rollAgain = page.getByRole('button', { name: 'Roll again' });
    for (let roll = 0; roll < 8; roll += 1) {
      const before = (await title.textContent()) ?? '';
      // a click while the last roll settles is ignored: click until one lands
      await expect(async () => {
        await rollAgain.click();
        await expect(title).not.toHaveText(before, { timeout: 600 });
      }).toPass();
      const id = idOfHref(await title.getAttribute('href'));
      expect(dealt).toContain(id);
      expect(seen.has(id)).toBe(false);
    }
  });

  test('one new show left: no Roll again; none: no block', async ({
    context,
    page,
  }) => {
    const seven = await daySeven(page);
    const left = seven[2] as number;
    const everything = TOP_RATED.map((series) => series.id);
    await signInAs(context, 'alex');
    await routeLibrary(page, {
      watched: everything.filter((id) => id !== left),
    });
    await page.goto('/');
    await page.locator(PICK).scrollIntoViewIfNeeded();
    await expect(page.locator(PICK)).toBeVisible();
    expect(await deckIds(page)).toEqual([left]);
    expect(idOfHref(await page.locator(TITLE).getAttribute('href'))).toBe(left);
    await expect(
      page.locator(PICK).getByRole('button', { name: 'Roll again' }),
    ).toHaveCount(0);

    await page.unrouteAll();
    await routeLibrary(page, { watched: everything });
    await page.goto('/');
    await page.getByTestId('route-home').waitFor();
    // the deck's placeholder goes once the library is known, and no card comes
    await expect(page.locator('[data-placeholder="pick-one"]')).toHaveCount(0);
    await expect(page.locator(PICK)).toHaveCount(0);
  });
});
