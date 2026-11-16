import { expect, test } from '@playwright/test';

import { answerStates, boxOf, idOfHref, STATES } from './helpers/seriesStates';
import { signInAs } from './helpers/session';

/**
 * Pick one for me's Watchlist: the shared watchlist-only toggle with the
 * page's read. A ghost at first paint, the viewer's state streamed in the
 * same box (the stub's read answers late), and a pick drawn by a roll takes
 * its state from the same read at once, with no ghost.
 */

const LATE = 4000;

test.describe('Pick one for me', () => {
  test.use({ viewport: { height: 900, width: 1440 } });
  const PICK = '[data-slot="pick-one"]';
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
