import { expect, test } from '@playwright/test';

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
  name: string;
  path: string;
  scale: 1 | 2;
  signedIn?: boolean;
}>;

// Every Home block at 1x (signed out), the profile's Up next card and
// favourites at 2x
const VISITS: ReadonlyArray<Visit> = [
  { name: 'Home', path: '/dev/home', scale: 1 },
  { name: 'the profile overview', path: '/u/alex', scale: 2, signedIn: true },
];

for (const visit of VISITS) {
  const { scale } = visit;
  test.describe(`at ${scale}x`, () => {
    test.use({
      deviceScaleFactor: scale,
      viewport: { height: 900, width: 1440 },
    });
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
      if (scale === 1) {
        // a half pixel down and in: straight edges land on part pixels
        await page.addStyleTag({
          content: 'body{margin-top:.5px;margin-left:.5px}',
        });
      }
      const problems = await findPictureEdges(page);
      expect(problems, formatEdgeProblems(problems)).toEqual([]);
    });
  });
}
