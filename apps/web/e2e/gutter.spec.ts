import { expect, type Page, test } from '@playwright/test';

import { leftEdges, offEdge } from './helpers/leftEdges';
import { type StubViewer, setLibraryHint, signInAs } from './helpers/session';

/**
 * One page gutter (`--gutter`: 24px on phones, 32px from md, so 112 at
 * 1440 in the 1280 container). On every page kind the header logo, the
 * footer logo, every on-page title and the first tile of every row start on
 * the same left edge (or, beside a sidebar, on the main column's edge), and
 * no phone width scrolls sideways.
 */

type Kind = Readonly<{
  /** desktop: the main column's left edge beside the sidebar, at 1440 */
  column?: number;
  name: string;
  path: string;
  /** titles that sit beside a picture on purpose (the person's name) */
  skip?: ReadonlyArray<string>;
  viewer?: StubViewer;
}>;

const KINDS: ReadonlyArray<Kind> = [
  // What's on (the toy on some days) heads its block beside the TV, in the
  // right column at 752, by design: the left edge stays 112 for the rest
  { column: 752, name: 'home', path: '/' },
  { column: 752, name: 'home, a new viewer', path: '/', viewer: 'nina' },
  { name: 'discover', path: '/discover' },
  { name: 'a landing', path: '/genre/crime' },
  { name: 'a series', path: '/136315/the-bear' },
  {
    column: 476,
    name: 'a person',
    path: '/person/17419/bryan-cranston',
    skip: ['Bryan Cranston'],
  },
  { column: 476, name: 'the profile', path: '/u/alex', viewer: 'alex' },
  // a brand-new account: Get started and an empty Up next, both dotted
  { column: 476, name: 'a new profile', path: '/u/nina', viewer: 'nina' },
  {
    column: 476,
    name: 'library',
    path: '/u/alex/library/watching',
    viewer: 'alex',
  },
  { column: 476, name: 'history', path: '/u/alex/history', viewer: 'alex' },
  { column: 424, name: 'settings', path: '/settings/profile', viewer: 'alex' },
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
  // nina's empty library: Get started on Home
  if (kind.viewer === 'nina') {
    await setLibraryHint(page.context(), 'nina', []);
  }
}

function edgesOf(
  edges: Awaited<ReturnType<typeof leftEdges>>,
  kind: Kind,
): Awaited<ReturnType<typeof leftEdges>> {
  const skip = kind.skip ?? [];
  return {
    ...edges,
    titles: edges.titles.filter((title) => !skip.includes(title.text)),
  };
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
        const edges = edgesOf(await leftEdges(page), kind);
        expect(offEdge(edges, [32])).toEqual([]);
      }
    }
  });

  test(`${kind.name}: one left edge at 1440`, async ({ page }) => {
    await signIn(page, kind);
    await page.setViewportSize({ height: 900, width: 1440 });
    await arrive(page, kind.path);
    const edges = edgesOf(await leftEdges(page), kind);
    const allowed = kind.column ? [112, kind.column] : [112];
    expect(offEdge(edges, allowed)).toEqual([]);
  });
}

// The series page's "Seen X before?" card sat at 20px and the
// season block's text at 28px on a phone (both from the 20px-gutter days)
for (const width of [360, 390]) {
  test(`a series page's prompt and season block start on the gutter at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });
    await arrive(page, '/136315/the-bear');
    const prompt = await page
      .getByRole('group', { name: 'Where are you in this series?' })
      .boundingBox();
    expect(Math.round(prompt?.x ?? -1)).toBe(32);
    const select = await page
      .locator('[data-season-header] > *')
      .first()
      .boundingBox();
    expect(Math.round(select?.x ?? -1)).toBe(32);
  });
}
