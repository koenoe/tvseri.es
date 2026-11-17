import { expect, type Page, test } from '@playwright/test';
import { type Box, expectParity, type Parity } from './helpers/parity';
import {
  measureNoScriptParity,
  VIEWPORTS,
  type ViewportName,
} from './helpers/placeholders';
import { signInAs, stubFault } from './helpers/session';

// Shell mechanism: JavaScript off (`helpers/placeholders.ts`): the fallback depends on viewer hints a pre-paint script sets, so it is read raw.

/**
 * Placeholder parity for the profile and its sub-pages (see
 * helpers/placeholders.ts): every fallback is the box of what replaces it,
 * and nothing shifts when the content arrives. One check per page type.
 * Read-only: the viewers only read.
 */

const OWNER_BLOCKS = [
  'profile-identity',
  'profile-blocks',
  'up-next',
  'almost-done',
  'season-ledger',
  'paused',
  'out-now',
  'catching-up',
  'coming-up',
  'waiting-for',
  'from-your-circle',
  'favourites',
  'recently-watched',
  'profile-tail',
] as const;

const VISITOR_BLOCKS = [
  'profile-identity',
  'profile-blocks',
  'watching-now',
  'you-both-watch',
  'also-watching',
  'where-your-tastes-split',
  'favourites',
  'profile-tail',
] as const;

/** Every page type at 1440; the busy overview on a phone too */
const SIZES: ReadonlyArray<ViewportName> = ['desktop', 'phone'];

/**
 * The sidebar: the identity (the layout's), the overview's blocks under it
 * (its `@aside`; on a phone someone else's match card) and its last blocks
 * (`@tail`, the page's end below lg)
 */
const SIDEBAR = [
  'profile-identity',
  'profile-blocks',
  'your-match',
  'profile-tail',
];

/**
 * The overview's blocks without the sidebar: its height follows the data
 * (a long handle is smaller, a long year sentence wraps, the match card's
 * proof names long titles). Below lg its top part is above the overview,
 * so the blocks are compared after its difference in height: the bottom of
 * the identity, or of someone else's match card (the `@aside` frame has no
 * box there).
 */
const sidebarAbove = (viewport: ViewportName) =>
  VIEWPORTS[viewport].width < 1024;

/** Below lg the `@aside` frame has no box: someone else's match card is measured instead */
const onScreen = (
  names: ReadonlyArray<string>,
  viewport: ViewportName,
  viewer: 'owner' | 'visitor',
): ReadonlyArray<string> =>
  sidebarAbove(viewport)
    ? names.flatMap((name) =>
        name !== 'profile-blocks'
          ? [name]
          : viewer === 'visitor'
            ? ['your-match']
            : [],
      )
    : names;

function belowTheSidebar(parity: Parity, viewport: ViewportName): Parity {
  const last = !sidebarAbove(viewport)
    ? 'profile-blocks'
    : 'your-match' in parity.placeholders
      ? 'your-match'
      : 'profile-identity';
  const placeholder = parity.placeholders[last];
  const slot = parity.slots[last];
  const dy =
    sidebarAbove(viewport) && placeholder && slot
      ? slot.y + slot.height - (placeholder.y + placeholder.height)
      : 0;
  const without = (boxes: Readonly<Record<string, Box>>) =>
    Object.fromEntries(
      Object.entries(boxes).filter(([name]) => !SIDEBAR.includes(name)),
    );
  return {
    ...parity,
    placeholders: without(parity.placeholders),
    slots: Object.fromEntries(
      Object.entries(without(parity.slots)).map(([name, box]) => [
        name,
        { ...box, y: box.y - dy },
      ]),
    ),
  };
}

for (const viewport of SIZES) {
  test.describe(`profile placeholders at ${VIEWPORTS[viewport].width}px`, () => {
    // The placeholders are the capped lanes of an established library
    // (overflow and caps): every lane full to its cap, with its Show all
    // foot. The sidebar follows the
    // handle's length and the year's sentence, so it is asserted on the
    // page below; below lg it sits above the overview, and the
    // blocks are compared after its difference. Between md and xl a block's
    // height steps with the width its rows wrap at; the placeholders are the
    // lanes' own rows, so they wrap with them at every width.
    test('your own overview, a busy library', async ({ browser }) => {
      const measured = await measureNoScriptParity(browser, {
        names: onScreen(OWNER_BLOCKS, viewport, 'owner'),
        path: '/u/marathonwatcher-2026',
        viewer: 'marathonwatcher-2026',
        viewport,
      });
      expectParity(belowTheSidebar(measured, viewport), { maxShift: 0.02 });
    });

    if (viewport !== 'desktop') {
      return;
    }

    test('someone else’s overview', async ({ browser }) => {
      const measured = await measureNoScriptParity(browser, {
        names: onScreen(VISITOR_BLOCKS, viewport, 'visitor'),
        path: '/u/juno',
        viewer: 'alex',
        viewport,
        visitor: true,
      });
      expectParity(measured, { maxShift: 0.02 });
    });

    // a full first page (24 shows) is exact: the toolbar and 24 ghosts
    for (const [path, name] of [
      ['library/watchlist', 'library-grid'],
    ] as const) {
      test(`${path} is its first page`, async ({ browser }) => {
        const measured = await measureNoScriptParity(browser, {
          names: [name],
          path: `/u/alex/${path}`,
          viewer: 'alex',
          viewport,
        });
        expectParity(measured, { maxShift: 0.02 });
      });
    }

    // The Library's parts each match their ghosts (skeletons mirror the
    // content): the toolbar, the first tile's poster, title and
    // meta rows, the shelf nav (from lg) or chips (below it)
    for (const shelf of ['watching'] as const) {
      test(`the ${shelf} shelf's inner blocks`, async ({ browser }) => {
        const names = [
          'library-toolbar',
          'library-tile',
          sidebarAbove(viewport) ? 'shelf-chips' : 'shelf-nav',
        ];
        const measured = await measureNoScriptParity(browser, {
          names,
          path: `/u/alex/library/${shelf}`,
          viewer: 'alex',
          viewport,
        });
        expectParity(measured, { maxShift: 0.02 });
      });
    }

    // Data-dependent length: the diary's frame and width are exact (its
    // first month header and day rows use the diary's own boxes; later
    // months follow the data); Jump to's column too (from lg)
    test('history keeps its frame and width', async ({ browser }) => {
      // Jump to is the sidebar's from lg; below it opens as a sheet
      const names = sidebarAbove(viewport)
        ? ['history-diary']
        : ['history-diary', 'history-jump'];
      const measured = await measureNoScriptParity(browser, {
        names,
        path: '/u/alex/history',
        viewer: 'alex',
        viewport,
      });
      for (const name of names) {
        const placeholder = measured.placeholders[name];
        const slot = measured.slots[name];
        expect(placeholder, name).toMatchObject({
          width: slot?.width,
          x: slot?.x,
          y: slot?.y,
        });
      }
    });

    // Circle: the page's frame is exact (its length is the
    // number of people) and so is a row, ring, three lines and a button
    test('your Circle keeps its frame; a row is exact', async ({ browser }) => {
      const measured = await measureNoScriptParity(browser, {
        names: ['circle', 'circle-row'],
        path: '/u/alex/circle',
        viewer: 'alex',
        viewport,
      });
      expectParity(measured, {
        heightTolerance: Number.POSITIVE_INFINITY,
        ignoreShift: true,
        names: ['circle'],
      });
      expectParity(measured, { maxShift: 0.02, names: ['circle-row'] });
    });
  });
}

test.describe('owner or visitor placeholders', () => {
  const visitorRuleOn = (page: Page) =>
    page.evaluate(() =>
      document.adoptedStyleSheets.some((sheet) =>
        [...sheet.cssRules].some((rule) =>
          rule.cssText.includes('.ph-visitor'),
        ),
      ),
    );

  test('the rule follows the profile on a hard load and on client navigations', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await page.goto('/u/juno');
    await expect(
      page.getByRole('heading', { name: 'Watching now' }),
    ).toBeVisible();
    expect(await visitorRuleOn(page)).toBe(true);

    // client navigation to your own profile turns it off, and back on
    await page.goto('/u/alex/circle');
    expect(await visitorRuleOn(page)).toBe(false);
    await page.getByRole('link', { exact: true, name: 'juno' }).first().click();
    await page.waitForURL('**/u/juno');
    expect(await visitorRuleOn(page)).toBe(true);
  });
});

/**
 * Get started's failure is the profile's centred card over the block's ghost
 * (each "didn't load" look fits its context), so a failure keeps the
 * block's size. nina is a new user; her watchlist read fails, which the
 * block reads for the shows Start something new borrowed, to make it throw
 * (a failed or broken Get started read only hides the block). The stub offers her no posters to mark as
 * seen, the ghost draws the common eight, so step 2 differs by exactly the
 * poster grid and everything else is exact.
 */
for (const viewport of ['phone'] as const) {
  test(`Get started fails into its own ghost at ${VIEWPORTS[viewport].width}px`, async ({
    browser,
  }) => {
    const measure = async (attribute: 'data-placeholder' | 'data-slot') => {
      const context = await browser.newContext({
        viewport: VIEWPORTS[viewport],
      });
      await signInAs(context, 'nina');
      const page = await context.newPage();
      await page.goto('/u/nina');
      const section = page.locator(`[${attribute}="get-started"]`);
      // a failed block's ghost only holds the space: hidden under the card
      if (attribute === 'data-placeholder') {
        await expect(section).toBeAttached();
      } else {
        await expect(section).toBeVisible();
      }
      if (attribute === 'data-placeholder') {
        await expect(
          page
            .getByRole('alert')
            .filter({ hasText: 'Get started didn’t load.' }),
        ).toBeVisible();
      }
      const boxes = await page.evaluate((name) => {
        const block = document.querySelector(`[${name}="get-started"]`);
        const top = block?.getBoundingClientRect().top ?? 0;
        const box = (selector: string) => {
          const element = document.querySelector(selector);
          const rect = element?.getBoundingClientRect();
          return rect ? { height: rect.height, y: rect.top - top } : null;
        };
        return {
          grid: box(`[${name}="get-started-step-2"] .grid`),
          section: box(`[${name}="get-started"]`),
          step1: box(`[${name}="get-started-step-1"]`),
          step2: box(`[${name}="get-started-step-2"]`),
          step3: box(`[${name}="get-started-step-3"]`),
        };
      }, attribute);
      await context.close();
      return boxes;
    };
    const loaded = await measure('data-slot');
    await stubFault('nina', { includes: '/list/watchlist', mode: '500' });
    const ghost = await measure('data-placeholder');
    const posters = ghost.grid?.height ?? 0;
    expect(posters).toBeGreaterThan(0);
    // the heading, the intro and step 1 sit exactly where they will
    expect(
      Math.abs((ghost.step1?.y ?? 0) - (loaded.step1?.y ?? 0)),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs((ghost.step1?.height ?? 0) - (loaded.step1?.height ?? 0)),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs((ghost.step3?.height ?? 0) - (loaded.step3?.height ?? 0)),
    ).toBeLessThanOrEqual(2);
    // step 2 and the block differ by the eight posters only
    expect(
      Math.abs(
        (ghost.step2?.height ?? 0) - (loaded.step2?.height ?? 0) - posters,
      ),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(
        (ghost.section?.height ?? 0) - (loaded.section?.height ?? 0) - posters,
      ),
    ).toBeLessThanOrEqual(2);
  });
}
