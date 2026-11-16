import { expect, type Page, test } from '@playwright/test';

import { findOverflow, formatProblems } from './helpers/overflow';
import { failSharedRead } from './helpers/session';

/**
 * Discover holds its text from a small phone to 1440, where its
 * layouts switch (`helpers/overflow.ts`): no sideways scroll, no text outside
 * its card, no value cut without an ellipsis. The hub and one landing of
 * each kind (the hub was 850px wide in an 800px window, and
 * the Drama landing's "Where to start" facts sat outside their cards).
 *
 * The landings whose hero draws chips are also checked failed (their reads
 * answer 503): a check found the hero's chip ghosts 824px wide, the page
 * scrolling sideways at 800 and 390. The failed hero is the loading
 * placeholder's own layout (`LandingHeroDetailsSkeleton`, only the fill
 * differs); `placeholders-landings` holds the loading shells to their
 * content's size. Decade and language heroes draw no chips.
 */

const WIDTHS = [360, 390, 800, 1100, 1440] as const;

const PAGES = [
  '/discover',
  '/genre/drama',
  '/theme/time-travel',
  '/network/netflix',
  '/country/kr',
  '/language/ko',
  '/decade/2000s',
] as const;

/** One slug per kind with hero chips that no other spec opens: its reads fail in this run */
const FAILED = [
  '/genre/western',
  '/theme/organised-crime',
  '/network/bbc-one',
  '/country/es',
] as const;

/** Every section has streamed in and the images are settled */
async function arrived(page: Page) {
  await expect(page.locator('[data-placeholder]:visible')).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

for (const width of WIDTHS) {
  test.describe(`Discover overflow at ${width}px`, () => {
    test.use({ viewport: { height: width < 500 ? 844 : 900, width } });

    for (const path of PAGES) {
      test(path, async ({ page }) => {
        await page.goto(path);
        await arrived(page);
        const problems = await findOverflow(page);
        expect(problems, formatProblems(problems)).toEqual([]);
      });
    }

    // at 800 the cards' desktop layout squeezed the posters to
    // 29px and the titles to one letter; a card keeps readable posters (the
    // phone card's three scale with the screen: 87px at 360, 97 at 390)
    test('Go deeper posters keep their size', async ({ page }) => {
      await page.goto('/discover');
      const card = page.locator('article[aria-label^="From "]').first();
      await card.scrollIntoViewIfNeeded();
      await arrived(page);
      const posters = await card
        .locator('img')
        .evaluateAll((images) =>
          images.map((image) => image.getBoundingClientRect().width),
        );
      expect(posters.length).toBeGreaterThan(0);
      for (const poster of posters) {
        expect(poster, 'poster width').toBeGreaterThanOrEqual(80);
      }
    });

    for (const path of FAILED) {
      test(`${path} failed`, async ({ page }) => {
        await failSharedRead(`/discover/landing${path}`);
        await page.goto(path);
        await expect(page.getByText(/didn.t load/i).first()).toBeVisible();
        await arrived(page);
        const problems = await findOverflow(page);
        expect(problems, formatProblems(problems)).toEqual([]);
      });
    }
  });
}
