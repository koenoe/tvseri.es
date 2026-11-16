import { expect, type Page, test } from '@playwright/test';

import { findOverflow, formatProblems } from './helpers/overflow';
import { signInAs } from './helpers/session';
import {
  clientSize,
  fontsSettled,
  pageLine,
  phoneScrollbars,
} from './helpers/viewport';

/**
 * The series page holds its text on a phone (`helpers/overflow.ts`): no sideways scroll, no text outside its card, no
 * value cut without an ellipsis. Signed in (alex): a season with a watched
 * stack (The Bear S3), one with a stack and a skipped episode (S2), and
 * Lantern Bay's specials with an upcoming one ("Next E03 …").
 */

/**
 * Phones: the desktop page's overlapping cast faces read as one control
 * over another to the scan (by design)
 */
const WIDTHS = [360, 390] as const;

const PAGES = [
  { name: 'The Bear season 3', path: '/136315/the-bear?season=3' },
  { name: 'The Bear season 2', path: '/136315/the-bear?season=2' },
  { name: 'Lantern Bay specials', path: '/900006/lantern-bay?season=0' },
] as const;

async function arrived(page: Page) {
  await expect(
    page.locator('section[aria-label="Episodes"] [data-episode-tile]').first(),
  ).toBeVisible();
  await expect(page.locator('[data-placeholder]:visible')).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  await fontsSettled(page);
}

for (const width of WIDTHS) {
  test.describe(`series page overflow at ${width}px`, () => {
    test.use({ viewport: { height: 844, width } });
    test.beforeEach(async ({ page }) => {
      await phoneScrollbars(page, width);
    });

    for (const { name, path } of PAGES) {
      test(name, async ({ context, page }) => {
        await signInAs(context, 'alex');
        await page.goto(path);
        await arrived(page);
        const problems = await findOverflow(page);
        expect(problems, formatProblems(problems)).toEqual([]);
      });
    }

    // Beside the fanned stills and the Show / Skipped pill the
    // text had ~50px on a phone ("E01–…" / "4" / "episodes" / "· Jul")
    test('watched-stack and skipped rows give their text room', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.goto('/136315/the-bear?season=2');
      await arrived(page);
      const rows = page.locator(
        '[data-stack-episodes], [data-episode-tile]:has(button[aria-label^="Skipped"])',
      );
      // two runs of watched episodes and the skipped E05 between them
      await expect(rows).toHaveCount(3);
      // the text keeps at least a third of its row (100px of a 360
      // phone's ~296px row), whatever the fonts
      const shares = await rows.evaluateAll((elements) =>
        elements.map((row) => {
          const text = row.querySelector('b')?.parentElement;
          return (
            (text?.getBoundingClientRect().width ?? 0) /
            row.getBoundingClientRect().width
          );
        }),
      );
      for (const share of shares) {
        expect(share, 'text width / row width').toBeGreaterThanOrEqual(1 / 3);
      }
    });
  });
}

// At 360 the ⋯ sheet's keys ran past the gutter to 353px: the dialog's
// grid took the big key's nowrap label as its column's minimum. The sheet
// pads with the page gutter (`px-gutter`): its keys start on the page
// line and end as far from the right edge
for (const width of WIDTHS) {
  test(`the ⋯ sheet keeps the page gutters at ${width}px`, async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });
    await phoneScrollbars(page, width);
    await signInAs(context, 'alex');
    await page.goto('/136315/the-bear');
    await page
      .getByRole('button', { name: 'More actions for The Bear' })
      .filter({ visible: true })
      .first()
      .click();
    const keys = page.getByRole('menu').locator('button');
    await expect(keys.first()).toBeVisible();
    const edges = await keys.evaluateAll((buttons) => {
      const boxes = buttons.map((button) => button.getBoundingClientRect());
      return {
        left: Math.min(...boxes.map((box) => box.left)),
        right: Math.max(...boxes.map((box) => box.right)),
      };
    });
    const [room, line] = await Promise.all([clientSize(page), pageLine(page)]);
    expect(Math.abs(edges.left - line)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(edges.right - (room.width - line))).toBeLessThanOrEqual(
      0.5,
    );
  });
}
