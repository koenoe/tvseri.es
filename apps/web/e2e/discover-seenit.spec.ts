import { expect, type Page, type Request, test } from '@playwright/test';

import { open } from './helpers';
import { signInAs } from './helpers/session';

/**
 * "Seen it" on a landing's Start here tile: "I have seen this". It marks
 * the show seen with no date, the toast says so with Undo, and the pair
 * crossfades to the one button for a show the viewer has (Finished, or Up
 * to date while episodes are still to air) in the same box. The stub gives
 * the catalogue's shows seasons and episodes to mark, and its
 * `/me/series-states` reads the marks back, so after a reload the tile
 * streams in already in that state.
 */
const TILE = '[data-slot="landing-hero"] article';
const tile = (page: Page) => page.locator(TILE);

const row = (page: Page) => tile(page).locator('[data-mark-control]').last();

const isAction = (request: Request) =>
  request.method() === 'POST' && Boolean(request.headers()['next-action']);

const rowBox = (page: Page) =>
  row(page).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return [rect.x, rect.y + window.scrollY, rect.width, rect.height].map(
      Math.round,
    );
  });

test('Seen it marks the show seen on the Start here tile, with Undo, and the tile keeps it', async ({
  context,
  page,
}) => {
  await signInAs(context, 'alex');
  await open(page, '/theme/dystopia');
  const seen = tile(page).getByRole('button', { name: /^Mark .* as seen$/ });
  await expect(seen).toBeVisible();
  await expect(row(page)).toHaveAttribute('data-mark-control', 'new');
  const box = await rowBox(page);

  // the mark's own server action: its id tells it from Undo's, whose answer
  // can land after the second press and would stand in for the save
  const firstPress = page.waitForRequest(isAction);
  await seen.click();
  const markAction = (await firstPress).headers()['next-action'];
  await expect(page.getByText(/^Marked .+ as seen$/)).toBeVisible();
  await expect(row(page)).toHaveAttribute('data-mark-control', 'finished');
  await expect(
    tile(page).getByRole('link', { name: /^Finished/ }),
  ).toBeVisible();
  expect(await rowBox(page)).toEqual(box);

  // Undo takes back exactly that press: the pair again
  // (the tile shows the pair at once; the second press waits until Undo is
  // stored, or the server could see the two out of order)
  const undone = page.waitForResponse((response) =>
    isAction(response.request()),
  );
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(row(page)).toHaveAttribute('data-mark-control', 'new');
  await undone;

  // marked again, then a reload streams the tile in as Finished
  const saved = page.waitForResponse(
    (response) =>
      isAction(response.request()) &&
      response.request().headers()['next-action'] === markAction,
  );
  await seen.click();
  await expect(row(page)).toHaveAttribute('data-mark-control', 'finished');
  await saved;
  await page.reload();
  await expect(row(page)).toHaveAttribute('data-mark-control', 'finished');
  expect(await rowBox(page)).toEqual(box);
});
