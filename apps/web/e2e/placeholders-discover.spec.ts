import { expect, type Page, test } from '@playwright/test';

import { CLS_LIMIT, readShifts, SHIFT_OBSERVER } from './helpers/parity';
import { VIEWPORTS } from './helpers/placeholders';
import { signInAs } from './helpers/session';
import { fontsSettled, untilStable } from './helpers/viewport';

/**
 * What changes on Discover after the first paint: the hub and an index
 * page load without a layout shift, and a signed-in viewer's marks (the
 * Watched labels on the hub's and a landing's tiles and the "You’ve seen N
 * of M" lines), which arrive on the client after hydration, fade in instead of
 * popping and move nothing. `placeholders-landings` holds the landings'
 * loading shells to their content's size.
 */

/** Every streamed part is in, the images and fonts have settled */
async function settle(page: Page) {
  await expect(page.locator('[data-placeholder]:visible')).toHaveCount(0, {
    timeout: 30_000,
  });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await fontsSettled(page);
  // a late shift: the page has stopped growing (the footer is the last thing
  // that can move)
  await untilStable(
    () => page.evaluate(() => document.documentElement.scrollHeight),
    { message: 'the page kept growing', quietMs: 400 },
  );
}

/** The hub at both widths, one index page (they share a layout) on a desktop */
const STATIC_PAGES = {
  desktop: ['/discover', '/network'],
  phone: ['/discover'],
} as const;

for (const name of ['desktop', 'phone'] as const) {
  test.describe(`Discover loads without a shift (${name})`, () => {
    test.use({ viewport: VIEWPORTS[name] });

    for (const path of STATIC_PAGES[name]) {
      test(path, async ({ page }) => {
        await page.addInitScript(SHIFT_OBSERVER);
        await page.goto(path);
        await settle(page);
        const { cls, shifts } = await readShifts(page);
        expect(cls, shifts.join('\n')).toBeLessThan(CLS_LIMIT);
      });
    }
  });
}

/** The show ids a page links to (`/{id}/{slug}`), from its HTML */
async function linkedShowIds(page: Page, path: string): Promise<number[]> {
  const html = await (await page.request.get(path)).text();
  const ids = [...html.matchAll(/href=\\?"\/(\d+)[/"\\]/g)].map((match) =>
    Number(match[1]),
  );
  return [...new Set(ids)];
}

/**
 * Runs in the page: the marks drawn after hydration (the Watched label, the
 * "You’ve seen" line) that appear without fading in, named by where they
 * are. A mark fades when it or its parent transitions `opacity`.
 */
const poppingMarks = () => {
  const fades = (element: Element | null) => {
    if (!element) {
      return false;
    }
    const style = getComputedStyle(element);
    return (
      /\b(opacity|all)\b/.test(style.transitionProperty) &&
      style.transitionDuration.split(',').some((part) => parseFloat(part) > 0)
    );
  };
  const where = (element: Element) =>
    element.closest('[data-slot]')?.getAttribute('data-slot') ??
    element.closest('[aria-label]')?.getAttribute('aria-label') ??
    'page';
  const labels = [...document.querySelectorAll('span')].filter(
    (span) =>
      span.textContent === 'Watched' &&
      span.querySelector('svg') &&
      span.classList.contains('rounded-full'),
  );
  // the line's text itself, not the spans around it
  const notes = [...document.querySelectorAll('span')].filter(
    (span) =>
      span.children.length === 0 &&
      /^You’ve seen \d+ of \d+$/.test(span.textContent ?? ''),
  );
  return {
    labels: labels.length,
    notes: notes.length,
    popping: [...labels, ...notes]
      .filter((mark) => !fades(mark) && !fades(mark.parentElement))
      .map((mark) => `${mark.textContent} in ${where(mark)}`),
  };
};

/** `notes`: the page draws "You’ve seen N of M" lines (the landings, not the hub) */
const SIGNED_IN_PAGES = [
  // hub tiles: Essentials, Go deeper, All-time favourites
  { notes: false, path: '/discover' },
  // poster rows, Where to start, the ranked list
  { notes: true, path: '/genre/drama' },
] as const;

test.describe('a signed-in viewer’s marks arrive without a shift or a pop', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  for (const { notes, path } of SIGNED_IN_PAGES) {
    test(path, async ({ context, page }) => {
      await signInAs(context, 'alex');
      // every show the page links to is watched: every tile kind draws its label
      const watched = await linkedShowIds(page, path);
      expect(watched.length, 'shows on the page').toBeGreaterThan(0);
      await page.route('**/api/me/library-ids', (route) =>
        route.fulfill({
          json: { favorites: [], inProgress: [], watched, watchlist: [] },
        }),
      );
      await page.addInitScript(SHIFT_OBSERVER);
      await page.goto(path);
      await settle(page);

      const marks = await page.evaluate(poppingMarks);
      console.log(
        `${path}: ${marks.labels} Watched labels, ${marks.notes} seen lines`,
      );
      expect(marks.labels, 'Watched labels drawn').toBeGreaterThan(0);
      if (notes) {
        expect(marks.notes, 'seen lines drawn').toBeGreaterThan(0);
      }
      expect(marks.popping, 'marks that pop in').toEqual([]);

      const { cls, shifts } = await readShifts(page);
      expect(cls, shifts.join('\n')).toBeLessThan(CLS_LIMIT);
    });
  }
});
