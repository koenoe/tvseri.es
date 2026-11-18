import { expect, test } from '@playwright/test';
import { expectParity, parityTable } from './helpers/parity';
import { measureParity } from './helpers/shellParity';

// Shell mechanism: `instant()` (`helpers/shellParity.ts`); an unseeded user and year give a page that is all fallback, which `instant()` holds.

/**
 * Placeholder parity for the stats page: an unseeded user and year, so the
 * whole page is the shell's fallback and every block is measured against
 * its content. The year's state (a current year has no Share beside its
 * title and a shorter sentence on a phone) and the data (Every day, Popular
 * unwatched) change a few phone blocks, so the phone asserts the ones that
 * do not move; the desktop asserts every block.
 */

const BLOCKS = [
  'stats-header',
  'stats-tiles',
  'stats-shows',
  'stats-first-last',
  'stats-finished',
  'stats-every-day',
  'stats-when',
  'stats-night',
  'stats-new',
  'stats-genres',
  'stats-services',
  'stats-map',
  'stats-popular',
] as const;

const run = async (
  page: import('@playwright/test').Page,
  baseURL: string | undefined,
  label: string,
  year = 2025,
) => {
  const parity = await measureParity(page, {
    baseURL,
    goto: () => page.goto(`/u/lena/stats/${year}`),
    ready: () =>
      expect(page.locator('[data-placeholder="stats"]')).toBeVisible(),
    shot: `stats-${label.replace(/\W+/g, '-')}`,
  });
  console.log(parityTable(parity, label));
  return parity;
};

test('stats desktop: every block is the size of its content', async ({
  baseURL,
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  const parity = await run(page, baseURL, 'stats desktop');
  expectParity(parity, { names: ['stats', 'stats-aside', ...BLOCKS] });
});

test('stats phone: the header, Shows, First and last, Finished, When, Night, Genres', async ({
  baseURL,
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  const parity = await run(page, baseURL, 'stats phone');
  expectParity(parity, {
    // Every day and Popular unwatched change size with the data
    ignoreShift: true,
    names: [
      'stats-phone-head',
      'stats-header',
      'stats-shows',
      'stats-first-last',
      'stats-finished',
      'stats-when',
      'stats-night',
      'stats-genres',
    ],
    sizeOnly: true,
  });
});

// Today in the rig is the real clock: the current year is a current year.
const THIS_YEAR = new Date().getUTCFullYear();

test('stats phone, a finished year: the header with its Share and the tiles are exact', async ({
  baseURL,
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  const parity = await run(
    page,
    baseURL,
    'stats phone finished',
    THIS_YEAR - 1,
  );
  expectParity(parity, {
    names: ['stats-phone-head', 'stats-header', 'stats-tiles', 'stats-shows'],
  });
});

test('stats phone, the current year: no Share is reserved', async ({
  baseURL,
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  const parity = await run(page, baseURL, 'stats phone current', THIS_YEAR);
  expectParity(parity, {
    ignoreShift: true,
    names: ['stats-phone-head', 'stats-tiles'],
  });
});
