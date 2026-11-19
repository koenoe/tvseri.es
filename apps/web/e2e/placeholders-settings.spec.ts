import { test } from '@playwright/test';
import { expectParity, parityTable } from './helpers/parity';
import { measureNoScriptParity } from './helpers/placeholders';

// Shell mechanism: JavaScript off (`helpers/placeholders.ts`): the fallback depends on viewer hints a pre-paint script sets, so it is read raw.

/**
 * Placeholder parity for every Settings section (see helpers/placeholders.ts).
 * The Plex card is checked as not connected, the state its placeholder
 * reserves (a connected card is taller and only grows that section); the
 * service cards start closed, so their placeholders are the header alone.
 */

/**
 * Every section at 1440; Your data also where its Export line wraps around
 * its streamed episode count (785 and 1085: the count's skeleton once
 * wrapped differently from the count, and the card grew a line).
 */
const SIZES = [
  { height: 900, sections: 'all', width: 1440 },
  { height: 900, sections: 'data', width: 785 },
  { height: 900, sections: 'data', width: 1085 },
] as const;

const SECTIONS = [
  ['/settings/profile', 'alex', ['settings-profile']],
  ['/settings/streaming-services', 'alex', ['services']],
  ['/settings/connected-apps', 'nina', ['plex', 'netflix', 'bbc', 'prime']],
  ['/settings/import', 'alex', ['import']],
  ['/settings/data', 'alex', ['data-stats', 'data-delete']],
] as const;

for (const viewport of SIZES) {
  test.describe(`settings placeholders at ${viewport.width}px`, () => {
    for (const [path, viewer, names] of SECTIONS) {
      if (viewport.sections === 'data' && path !== '/settings/data') continue;
      test(path, async ({ browser }) => {
        const measured = await measureNoScriptParity(browser, {
          names,
          path,
          viewer,
          viewport: { height: viewport.height, width: viewport.width },
        });
        console.log(parityTable(measured, `${path} at ${viewport.width}px`));
        expectParity(measured, { maxShift: 0.02 });
      });
    }
  });
}
