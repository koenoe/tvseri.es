import { expect, type Page, test } from '@playwright/test';

import { fontsSettled } from './helpers/viewport';

/**
 * A show without a cast keeps no space for one: from the hero's last row
 * (rating and buttons) down to the episodes section there is only the
 * section's own top margin, with nothing reserved for faces. Measured
 * against a show with a cast on the same page, and against the section's own
 * margin, so no pixel constant is involved. Quiet Street (900007) has no
 * cast and no creators; Harbour Lights (900004) has ten faces.
 */

const NO_CAST = '/900007/quiet-street';
const WITH_CAST = '/900004/harbour-lights';

type Gap = Readonly<{ gap: number; margin: number }>;

async function heroToEpisodes(page: Page, path: string): Promise<Gap> {
  await page.goto(path);
  await expect(
    page.locator('section[aria-label="Episodes"] [data-episode-tile]').first(),
  ).toBeVisible();
  await expect(page.locator('[data-placeholder]:visible')).toHaveCount(0);
  await fontsSettled(page);
  return page.evaluate(() => {
    const show = document.querySelector('[data-testid="route-show"]');
    const hero = show?.firstElementChild;
    const section = document.querySelector('[data-slot="episodes-section"]');
    if (!hero || !section) {
      throw new Error('The show page has no hero or episodes section');
    }
    return {
      gap:
        section.getBoundingClientRect().top -
        hero.getBoundingClientRect().bottom,
      margin: Number.parseFloat(getComputedStyle(section).marginTop),
    };
  });
}

for (const viewport of [
  { height: 900, width: 1440 },
  { height: 844, width: 390 },
]) {
  test.describe(`no cast at ${viewport.width}px`, () => {
    test.use({ viewport });

    test('the hero meets the episodes with the section’s own margin', async ({
      page,
    }) => {
      const quiet = await heroToEpisodes(page, NO_CAST);
      // no box between them: the whole gap is the section's top margin
      expect(quiet.gap).toBeCloseTo(quiet.margin, 0);
      // no cast box in the page, not even an empty one
      await expect(page.locator('[data-slot="cast"]')).toHaveCount(0);

      const full = await heroToEpisodes(page, WITH_CAST);
      if (viewport.width >= 1024) {
        // the faces' row is real space on a show that has them
        expect(full.gap).toBeGreaterThan(quiet.gap + 96);
      } else {
        // phones draw no cast at all: both are the same
        expect(full.gap).toBeCloseTo(quiet.gap, 0);
      }
    });
  });
}
