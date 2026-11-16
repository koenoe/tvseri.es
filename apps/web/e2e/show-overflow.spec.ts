import { expect, type Page, test } from '@playwright/test';

import { findOverflow, formatProblems } from './helpers/overflow';
import { signInAs } from './helpers/session';

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
  await page.evaluate(() => document.fonts.ready);
}

for (const width of WIDTHS) {
  test.describe(`series page overflow at ${width}px`, () => {
    test.use({ viewport: { height: 844, width } });

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
      const widths = await rows.evaluateAll((elements) =>
        elements.map(
          (row) =>
            row.querySelector('b')?.parentElement?.getBoundingClientRect()
              .width ?? 0,
        ),
      );
      for (const textWidth of widths) {
        expect(textWidth).toBeGreaterThanOrEqual(100);
      }
    });
  });
}

// At 360 the ⋯ sheet's keys ran past the gutter to 353px: the dialog's
// grid took the big key's nowrap label as its column's minimum. The sheet
// pads with the page gutter (`px-gutter`, 32px)
for (const width of WIDTHS) {
  test(`the ⋯ sheet keeps the page gutters at ${width}px`, async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });
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
    expect(Math.round(edges.left)).toBe(32);
    expect(Math.round(edges.right)).toBe(width - 32);
  });
}
