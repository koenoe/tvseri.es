import { expect, type Locator, type Page, test } from '@playwright/test';

import { open } from './helpers';
import {
  findPictureEdges,
  formatEdgeProblems,
  routeBrightPictures,
} from './helpers/pictureEdges';
import { signInAs } from './helpers/session';

/**
 * No light line along a rounded picture card's edge
 * (`src/components/ui/picture/pictureSurface.ts`): with every picture
 * bright, each card that clips a picture under a shade is measured along
 * its straight sides and its corners (`helpers/pictureEdges.ts`), at 1x on a
 * half pixel (where straight edges are part pixels too) and at 2x.
 * Deliberate rings are marked `data-hairline` and turned off while measuring.
 */

type Visit = Readonly<{
  /** Extra page CSS while measuring */
  css?: string;
  name: string;
  path: string;
  /** Measure only here */
  scope?: (page: Page) => Locator;
  signedIn?: boolean;
}>;

const VISITS: ReadonlyArray<Visit> = [
  // every Home block (the Up next card too), signed out
  { name: 'Home', path: '/dev/home' },
  { name: 'Discover', path: '/discover' },
  { name: 'a theme landing', path: '/theme/dystopia' },
  { name: 'a decade landing', path: '/decade/2000s' },
  {
    // the page behind the dialog hidden: its text under the scrim, right
    // above the panel's edge, is not the panel's
    css: 'body *{visibility:hidden}dialog,dialog *{visibility:visible}',
    name: 'the episode modal',
    path: '/136315/the-bear?season=3&episode=6',
  },
  // the Up next card and the favourites
  { name: 'the profile overview', path: '/u/alex', signedIn: true },
  {
    name: 'the profile’s favourites',
    path: '/u/alex',
    scope: (page) => page.getByRole('region', { name: 'Favourites' }),
    signedIn: true,
  },
];

for (const scale of [1, 2] as const) {
  test.describe(`at ${scale}x`, () => {
    test.use({
      deviceScaleFactor: scale,
      viewport: { height: 900, width: 1440 },
    });

    for (const visit of VISITS) {
      test(`${visit.name}: no light line along a picture card’s edge`, async ({
        context,
        page,
      }) => {
        test.slow();
        await routeBrightPictures(context);
        if (visit.signedIn) {
          await signInAs(context, 'alex');
        }
        await open(page, visit.path);
        if (visit.css) {
          await page.addStyleTag({ content: visit.css });
        }
        if (scale === 1) {
          // a half pixel down and in: straight edges land on part pixels
          await page.addStyleTag({
            content: 'body{margin-top:.5px;margin-left:.5px}',
          });
        }
        const problems = await findPictureEdges(page, visit.scope?.(page));
        expect(problems, formatEdgeProblems(problems)).toEqual([]);
      });
    }
  });
}
