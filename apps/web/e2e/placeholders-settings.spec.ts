import { test } from '@playwright/test';
import { expectParity } from './helpers/parity';
import {
  measureNoScriptParity,
  VIEWPORTS,
  type ViewportName,
} from './helpers/placeholders';

// Shell mechanism: JavaScript off (`helpers/placeholders.ts`): the fallback depends on viewer hints a pre-paint script sets, so it is read raw.

/**
 * Placeholder parity for every Settings section (see helpers/placeholders.ts).
 * The Plex card is checked as not connected, the state its placeholder
 * reserves (a connected card is taller and only grows that section).
 */

const SIZES = Object.keys(VIEWPORTS) as ViewportName[];

const SECTIONS = [
  ['/settings/profile', 'alex', ['settings-profile']],
  ['/settings/streaming-services', 'alex', ['services']],
  ['/settings/plex', 'nina', ['plex']],
  ['/settings/import', 'alex', ['import']],
  ['/settings/data', 'alex', ['data-stats', 'data-delete']],
] as const;

for (const viewport of SIZES) {
  test.describe(`settings placeholders at ${VIEWPORTS[viewport].width}px`, () => {
    for (const [path, viewer, names] of SECTIONS) {
      test(path, async ({ browser }) => {
        const measured = await measureNoScriptParity(browser, {
          names,
          path,
          viewer,
          viewport,
        });
        expectParity(measured, { maxShift: 0.02 });
      });
    }
  });
}
