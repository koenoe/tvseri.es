import { expect, type Page, test } from '@playwright/test';

import { VIEWPORTS } from './helpers/placeholders';
import {
  changes,
  controlSearch,
  dialog,
  field,
  firstQueryOnSlow,
  open,
  openFromHeader,
  option,
  sampleSearch,
} from './helpers/search';

/**
 * Search while loading: a request out for 250 ms fades what is shown to 50%
 * until the answer swaps in place; on the first query static ghost rows take
 * the results' space. Latency per test with `controlSearch`.
 */

const SLOW = 2500;

/** “bre” on screen at full strength, fast */
async function showBre(page: Page) {
  await field(page).fill('bre');
  await expect(option(page, /^Breaking Bad/)).toBeVisible();
  await expect(dialog(page).getByRole('listbox')).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

test('first query, slow: ghosts 400 ms after the key, then the results in the same boxes', async ({
  page,
}) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  const control = await controlSearch(page);
  control.ms = SLOW;
  await open(page);
  await openFromHeader(page);
  const run = await firstQueryOnSlow(page, SLOW);

  expect(run.landed.poster).toEqual(run.ghosts.poster);
  expect(run.landed.overline).toEqual(run.ghosts.overline);
  expect(run.landed.panel?.height).toBe(run.ghosts.panel?.height);
  // 150 ms debounce + 250 ms: not before (a frame of slack)
  expect(run.ghostsAfter).toBeGreaterThanOrEqual(380);
  expect(run.busy).toEqual(['true', 'false']);
  // ghosts once, then results: no flash of the recents or an empty body
  expect(run.shown).toEqual(['ghosts', 'results']);
  expect(run.dimmed).toBe(false);
  expect(run.shifts).toEqual([]);
});

test('change query, slow: the old results dim, then the new ones swap in at full strength', async ({
  page,
}) => {
  const control = await controlSearch(page);
  await open(page);
  await openFromHeader(page);
  await showBre(page);
  control.ms = SLOW;

  await field(page).fill('brian cox');
  await expect(dialog(page).getByRole('listbox')).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await expect(option(page, /^Breaking Bad/)).toBeVisible();
  const shown = dialog(page).getByRole('listbox').locator('..');
  await expect(shown).toHaveCSS('opacity', '0.5');

  await expect(dialog(page).getByRole('group').first()).toHaveAccessibleName(
    'People',
    { timeout: SLOW + 2000 },
  );
  await expect(shown).toHaveCSS('opacity', '1');
  await expect(option(page, /^Breaking Bad/)).toHaveCount(0);
});

test('failure, then Try again: the error line at full strength; the retry dims it after 250 ms, then the results', async ({
  page,
}) => {
  const control = await controlSearch(page);
  control.ms = 600;
  control.failNext = true;
  await open(page);
  await openFromHeader(page);

  await field(page).fill('the bear');
  const error = dialog(page).getByText('Search didn’t load for “the bear”.');
  await expect(error).toBeVisible();
  const shown = dialog(page).getByRole('listbox').locator('..');
  await expect(shown).toHaveCSS('opacity', '1');
  await expect(dialog(page).locator('[data-ghost]')).toHaveCount(0);

  control.ms = SLOW;
  const recorder = await sampleSearch(page);
  await dialog(page).getByRole('button', { name: 'Try again' }).click();
  await expect(shown).toHaveCSS('opacity', '0.5');
  await expect(option(page, /^The Bear/).first()).toBeVisible({
    timeout: SLOW + 2000,
  });
  await expect(shown).toHaveCSS('opacity', '1');

  const { samples } = await recorder.read();
  // the line stayed (dimmed) until the answer: no ghosts in between
  expect(samples.filter((sample) => sample.ghosts > 0)).toEqual([]);
  expect(
    changes(samples.map((sample) => (sample.results ? 'results' : 'line'))),
  ).toEqual(['line', 'results']);
});
