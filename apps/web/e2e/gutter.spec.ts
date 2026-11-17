import { expect, type Page, test } from '@playwright/test';

import { leftEdges, offEdge } from './helpers/leftEdges';
import { type StubViewer, signInAs } from './helpers/session';
import { pageLine } from './helpers/viewport';

/**
 * One page gutter (`--gutter`, inside the 1280 container: 112 at 1440 with
 * an overlay scrollbar). On each page layout the header logo, the footer
 * logo, every on-page title and the first tile of every row start on the
 * page line (or, beside a sidebar, on the main column's edge), and no phone
 * width scrolls sideways.
 */

type Kind = Readonly<{
  /** desktop: the main column's edge beside the sidebar, px from the page line */
  column?: number;
  name: string;
  path: string;
  viewer?: StubViewer;
}>;

// One page per layout: full width, a series, beside the profile's sidebar,
// beside the settings nav
const KINDS: ReadonlyArray<Kind> = [
  // What's on (the toy on some days) heads its block beside the TV, in the
  // right column (600px + 40px gap), by design: the rest stays on the line
  { column: 640, name: 'home', path: '/' },
  { name: 'a series', path: '/136315/the-bear' },
  // beside the profile's sidebar and its gap
  { column: 364, name: 'the profile', path: '/u/alex', viewer: 'alex' },
  // beside the 248px settings nav and its 64px gap
  { column: 312, name: 'settings', path: '/settings/profile', viewer: 'alex' },
];

const PHONE_WIDTHS = [360, 375, 390, 430] as const;

async function arrive(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('[data-placeholder]:visible')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

async function signIn(page: Page, kind: Kind) {
  if (!kind.viewer) return;
  await signInAs(page.context(), kind.viewer);
}

for (const kind of KINDS) {
  test(`${kind.name}: one left edge at 390, no sideways scroll at 360–430`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page, kind);
    for (const width of PHONE_WIDTHS) {
      await page.setViewportSize({ height: 844, width });
      await arrive(page, kind.path);
      const scroll = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(scroll, `${width}px scrolls sideways`).toBeLessThanOrEqual(0);
      if (width === 390) {
        const edges = await leftEdges(page);
        expect(offEdge(edges)).toEqual([]);
      }
    }
  });

  test(`${kind.name}: one left edge at 1440`, async ({ page }) => {
    await signIn(page, kind);
    await page.setViewportSize({ height: 900, width: 1440 });
    await arrive(page, kind.path);
    const edges = await leftEdges(page);
    const columns = kind.column ? [kind.column] : [];
    expect(offEdge(edges, { columns })).toEqual([]);
  });
}

// The series page's "Seen X before?" card sat at 20px and the
// season block's text at 28px on a phone (both from the 20px-gutter days)
for (const width of [360]) {
  test(`a series page's prompt and season block start on the gutter at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });
    await arrive(page, '/136315/the-bear');
    const line = await pageLine(page);
    const prompt = await page
      .getByRole('group', { name: 'Where are you in this series?' })
      .boundingBox();
    expect(Math.abs((prompt?.x ?? -1) - line)).toBeLessThanOrEqual(0.5);
    const select = await page
      .locator('[data-season-header] > *')
      .first()
      .boundingBox();
    expect(Math.abs((select?.x ?? -1) - line)).toBeLessThanOrEqual(0.5);
  });
}
