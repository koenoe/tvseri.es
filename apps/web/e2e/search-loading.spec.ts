import { expect, type Page, test } from '@playwright/test';

import { namedViewports } from './helpers/placeholders';
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
 * Search while loading: no loading line; a
 * request out for 250 ms fades what is shown to 50% until the answer swaps
 * in place; on the first query static ghost rows take the results' space.
 * Latency per test with `controlSearch` (fast 150 ms, slow 2.5 s), every
 * animation frame recorded with `sampleSearch`.
 */

const FAST = 150;
const SLOW = 2500;

const VIEWPORTS = namedViewports('desktop', 'phone');

const panel = (page: Page) => dialog(page).locator('.remote-surface');

/** “bre” on screen at full strength, fast */
async function showBre(page: Page) {
  await field(page).fill('bre');
  await expect(option(page, /^Breaking Bad/)).toBeVisible();
  await expect(dialog(page).getByRole('listbox')).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

test('no loading line under the field, at any point', async ({ page }) => {
  const control = await controlSearch(page);
  control.ms = SLOW;
  await open(page);
  await openFromHeader(page);
  await field(page).fill('the bear');
  await expect(dialog(page).locator('[data-ghost]').first()).toBeVisible();

  const row = field(page).locator('..');
  await expect(row.locator('[aria-hidden="true"]:not(svg)')).toHaveCount(0);
});

test('fast (150 ms): nothing shows: no ghost, no dim, never busy', async ({
  page,
}) => {
  const control = await controlSearch(page);
  control.ms = FAST;
  await open(page);
  // the server's own time counts towards the 150 ms: answer from a warm route
  for (const q of ['the%20bear', 'bre']) {
    await page.request.get(`/api/search?q=${q}`);
  }
  await openFromHeader(page);
  const recorder = await sampleSearch(page);

  await field(page).fill('the bear');
  await expect(option(page, /^The Bear/).first()).toBeVisible();
  // a refine, also fast
  await field(page).fill('bre');
  await expect(option(page, /^Breaking Bad/)).toBeVisible();
  await page.waitForTimeout(300);

  const { samples } = await recorder.read();
  expect(samples.length).toBeGreaterThan(10);
  expect(samples.filter((sample) => sample.ghosts > 0)).toEqual([]);
  expect(samples.filter((sample) => sample.busy === 'true')).toEqual([]);
  expect(samples.filter((sample) => sample.opacity < 1)).toEqual([]);
});

for (const viewport of VIEWPORTS) {
  test(`first query, slow (${viewport.name}): ghosts 400 ms after the key, then the results in the same boxes`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const control = await controlSearch(page);
    control.ms = SLOW;
    await open(page);
    await openFromHeader(page);

    const run = await firstQueryOnSlow(page, SLOW);

    expect(run.landed.poster).toEqual(run.ghosts.poster);
    expect(run.landed.overline).toEqual(run.ghosts.overline);
    expect(run.landed.panel?.height).toBe(run.ghosts.panel?.height);
    // 150 ms debounce + 250 ms: not before, and on time (a frame of slack,
    // more under a loaded machine)
    expect(run.ghostsAfter).toBeGreaterThanOrEqual(380);
    expect(run.ghostsAfter).toBeLessThan(400 + 250);
    expect(run.busy).toEqual(['true', 'false']);
    // ghosts once, then results: no flash of the recents or an empty body
    expect(run.shown).toEqual(['ghosts', 'results']);
    expect(run.dimmed).toBe(false);
    expect(run.shifts).toEqual([]);
  });
}

test('refine, slow: the results fade to 50% and the answer swaps in place', async ({
  page,
}) => {
  const control = await controlSearch(page);
  await open(page);
  await openFromHeader(page);
  await showBre(page);
  const before = await panel(page).boundingBox();
  control.ms = SLOW;
  const recorder = await sampleSearch(page);

  await field(page).pressSequentially('aking', { delay: 40 });
  await expect(dialog(page).getByRole('listbox')).toHaveAttribute(
    'aria-busy',
    'true',
  );
  // stale results stay operable
  await expect(option(page, /^Breaking Bad/)).toHaveAttribute(
    'href',
    '/1396/breaking-bad',
  );
  await expect(dialog(page).getByRole('group', { name: 'People' })).toBeVisible(
    { timeout: SLOW + 2000 },
  );
  await page.waitForTimeout(250);

  const { samples } = await recorder.read();
  const opacities = samples.map((sample) => sample.opacity);
  expect(Math.min(...opacities)).toBe(0.5);
  expect(opacities.at(-1)).toBe(1);
  expect(samples.filter((sample) => sample.ghosts > 0)).toEqual([]);
  // down once, up once: never a strobe
  const lowest = opacities.indexOf(0.5);
  const back = opacities.findIndex((value, i) => i > lowest && value > 0.5);
  expect(opacities.slice(lowest, back).every((value) => value === 0.5)).toBe(
    true,
  );
  expect((await panel(page).boundingBox())?.height).toBe(before?.height);
});

test('typing burst on slow (a key every 200 ms, a request per key): one steady dim, aria-busy flips once', async ({
  page,
}) => {
  const control = await controlSearch(page);
  control.ms = SLOW;
  await open(page);
  await openFromHeader(page);
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/search')) {
      requests.push(request.url());
    }
  });
  const recorder = await sampleSearch(page);

  await field(page).fill('t');
  await field(page).pressSequentially('he bear', { delay: 200 });
  await expect(option(page, /^The Bear/).first()).toBeVisible({
    timeout: SLOW + 2000,
  });

  expect(requests.length).toBeGreaterThan(3);
  const { samples } = await recorder.read();
  // the body appears with the ghosts (no recents yet on this device)
  expect(changes(samples.map((sample) => sample.busy))).toEqual([
    'true',
    'false',
  ]);
  expect(
    changes(samples.map((sample) => (sample.ghosts ? 'ghosts' : 'results'))),
  ).toEqual(['ghosts', 'results']);
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

// "Nothing for …" is one line: the panel is as small as that line, not the
// height it held for the rows
test('no results, slow: the stale list gives way to the line at full strength, the panel as small as the line', async ({
  page,
}) => {
  const control = await controlSearch(page);
  await open(page);
  await openFromHeader(page);
  await showBre(page);
  const before = await panel(page).boundingBox();
  control.ms = SLOW;

  await field(page).fill('zzqx');
  const shown = dialog(page).getByRole('listbox').locator('..');
  await expect(shown).toHaveCSS('opacity', '0.5');
  await expect(dialog(page).getByText('Nothing for “zzqx”')).toBeVisible({
    timeout: SLOW + 2000,
  });
  await expect(shown).toHaveCSS('opacity', '1');
  const line = await dialog(page).getByText('Nothing for “zzqx”').boundingBox();
  const after = await panel(page).boundingBox();
  expect(after?.height).toBeLessThan(before?.height ?? 0);
  // the line and the body's padding fill it: no empty sheet under the line
  expect(
    (after?.y ?? 0) +
      (after?.height ?? 0) -
      (line?.y ?? 0) -
      (line?.height ?? 0),
  ).toBeLessThanOrEqual(64);
  await expect(dialog(page).locator('p[aria-live="polite"]')).toHaveText(
    'Nothing for zzqx',
  );
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

test('emptying the field brings the recents back at once, at full strength, and the body is as tall as they are', async ({
  page,
}) => {
  const control = await controlSearch(page);
  await open(page);
  await openFromHeader(page);
  await field(page).fill('the bear');
  await option(page, /^The Bear/)
    .first()
    .click();
  await expect(page).toHaveURL('/136315/the-bear');
  await openFromHeader(page);
  const recents = await panel(page).boundingBox();
  control.ms = SLOW;

  await field(page).fill('bre');
  await expect(dialog(page).locator('[data-ghost]').first()).toBeVisible();
  const locked = await panel(page).boundingBox();
  expect(locked?.height).toBeGreaterThan(recents?.height ?? 0);
  await field(page).fill('');

  await expect(
    dialog(page).getByRole('group', { name: 'Recent' }),
  ).toBeVisible();
  await expect(dialog(page).locator('[data-ghost]')).toHaveCount(0);
  await expect(dialog(page).getByRole('listbox')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  expect((await panel(page).boundingBox())?.height).toBe(recents?.height);
  // the request that was out never lands on the recents
  await page.waitForTimeout(SLOW);
  await expect(
    dialog(page).getByRole('group', { name: 'Recent' }),
  ).toBeVisible();
});
