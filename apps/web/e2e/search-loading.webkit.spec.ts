import { expect, test } from '@playwright/test';

import {
  controlSearch,
  firstQueryOnSlow,
  open,
  openFromHeader,
} from './helpers/search';

/**
 * SR Loading in Safari's engine on the phone sheet (390 wide): the first
 * query's ghosts sit exactly where the results land, nothing dims, the sheet
 * keeps its height. (WebKit reports no layout-shift entries; the boxes are
 * the check.)
 */
test.use({ viewport: { height: 844, width: 390 } });

const SLOW = 2500;

test('phone sheet, first query on a slow answer: ghosts, then the results in the same boxes', async ({
  page,
}) => {
  const control = await controlSearch(page);
  control.ms = SLOW;
  await open(page);
  await openFromHeader(page);

  const run = await firstQueryOnSlow(page, SLOW);

  expect(run.landed.poster).toEqual(run.ghosts.poster);
  expect(run.landed.overline).toEqual(run.ghosts.overline);
  expect(run.landed.panel?.height).toBe(run.ghosts.panel?.height);
  expect(run.ghostsAfter).toBeGreaterThanOrEqual(380);
  expect(run.busy).toEqual(['true', 'false']);
  expect(run.shown).toEqual(['ghosts', 'results']);
  expect(run.dimmed).toBe(false);
});
