import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './helpers/session';
import { progress } from './helpers/showPage';
import { phoneScrollbars, untilStable } from './helpers/viewport';

/**
 * The signed-in show page end to end: no console or
 * hydration errors, and a mark survives Home → Back (Next re-runs the
 * preserved page's effects with its old payload; that seed must not undo the
 * mark).
 */

const SHOW = '/136315/the-bear';

/**
 * The rig's local images (the auth stub's `/img/*` on localhost) are blocked
 * by the site's CSP, which allows only TMDB's image host: not the page's
 * error.
 */
const isRigImage = (text: string) =>
  text.includes('Content Security Policy') &&
  /'http:\/\/localhost:\d+\/img\//.test(text);

/** Every console error and uncaught error (hydration mismatches log both). */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !isRigImage(message.text())) {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

test.beforeEach(async ({ context }) => {
  await signInAs(context, 'alex');
});

test('a signed-in show page loads without console or hydration errors', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(SHOW);
  await expect(progress(page)).toContainText('21 of 47');
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('the viewer’s progress line is in the HTML, before any JS', async ({
  page,
}) => {
  // No JS chunk loads: React's inline script alone reveals the viewer holes,
  // so what shows is what the first paint shows (nothing fills in later).
  await page.route('**/_next/static/chunks/**', (route) => route.abort());
  await page.goto(SHOW);
  await expect(progress(page)).toContainText('21 of 47');
  await expect(page.locator('[data-placeholder="progress"]')).toBeHidden();
});

test('a mark survives going Home and pressing Back', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(SHOW);
  await expect(progress(page)).toContainText('21 of 47');

  await page
    .getByRole('button', { name: 'More actions for The Bear' })
    .first()
    .click();
  await page.keyboard.press('n');
  await expect(progress(page)).toContainText('22 of 47');
  // The write has settled on the server before we leave.
  await page.waitForLoadState('networkidle');

  await page.getByRole('link', { name: 'tvseri.es home' }).first().click();
  await page.waitForURL((url) => url.pathname === '/');
  await page.goBack();
  await page.waitForURL((url) => url.pathname === SHOW);

  await expect(progress(page)).toContainText('22 of 47');
  // And it stays: the effects the preserved page re-runs come after paint.
  await page.waitForLoadState('networkidle');
  await expect(progress(page)).toContainText('22 of 47');
  expect(errors).toEqual([]);
});

// Vertically cramped on mobile otherwise: on a phone the hero's rows sit
// close (title to facts, facts to the progress text, progress text to the
// rating and actions) and the progress line is a 44px tap target. Measured
// between boxes, the way the board draws them.
const heroGaps = async (page: Page, width: number) => {
  await page.setViewportSize({ height: 844, width });
  await phoneScrollbars(page, width);
  await page.goto(SHOW);
  await expect(progress(page)).toContainText('21 of 47');
  const read = () =>
    progress(page).evaluate((line) => {
      const box = (node: Element | null | undefined) => {
        const rect = node?.getBoundingClientRect();
        return {
          bottom: rect?.bottom ?? Number.NaN,
          top: rect?.top ?? Number.NaN,
        };
      };
      const title = line.parentElement?.querySelector('h1');
      const rows = {
        actionsRow: box(
          document.querySelector('[data-slot="actions"]')?.parentElement,
        ),
        meta: box(title?.nextElementSibling),
        text: box(line.firstElementChild),
        title: box(title),
      };
      return {
        actionsGap: rows.actionsRow.top - rows.text.bottom,
        line: line.getBoundingClientRect().height,
        metaGap: rows.meta.top - rows.title.bottom,
        textGap: rows.text.top - rows.meta.bottom,
      };
    });
  // the viewer's rows have streamed in and the hero has stopped moving
  await untilStable(read, { message: 'the hero stops moving' });
  return read();
};

for (const width of [390, 360]) {
  test(`the phone hero's rows stack in order and the progress line is a tap target at ${width}`, async ({
    page,
  }) => {
    const gaps = await heroGaps(page, width);
    expect(gaps.line).toBeGreaterThanOrEqual(44);
    // in order, never overlapping, the two rows around the progress text
    // spaced alike and no tighter than the facts under the title
    expect(gaps.metaGap).toBeGreaterThanOrEqual(0);
    expect(gaps.textGap).toBeGreaterThanOrEqual(gaps.metaGap);
    expect(gaps.actionsGap).toBeCloseTo(gaps.textGap, 0);
  });

  test(`@design the phone hero's rows sit 16, 20 and 20px apart at ${width}`, async ({
    page,
  }) => {
    const gaps = await heroGaps(page, width);
    expect(gaps.metaGap).toBeCloseTo(16, 0);
    expect(gaps.textGap).toBeCloseTo(20, 0);
    expect(gaps.actionsGap).toBeCloseTo(20, 0);
  });
}
