import { expect, type Page, test } from '@playwright/test';

import { expectHydrated } from './helpers';
import { markWatched, signInAs } from './helpers/session';
import { fontsSettled, phoneScrollbars } from './helpers/viewport';

/**
 * The Focus wall's composition on awkward seasons, measured in the browser: no hole taller than
 * the grid gap between tiles in a column, the column beside a tall Focus
 * ending where Focus ends, and the "N watched" heading counting exactly the
 * episodes under it, with no watched episode outside that group. The shows
 * are the stub's one-season wall lab (`fixtures/show/catalog.ts`).
 */

type Box = Readonly<{
  code: string;
  focus: string | null;
  stack: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}>;

type Group = Readonly<{
  watched: boolean;
  gap: number;
  heading: string | null;
  tiles: ReadonlyArray<Box>;
}>;

const wallGroups = (page: Page) =>
  page.evaluate((): ReadonlyArray<Group> => {
    const wall = document.querySelector(
      '[data-testid="route-show"] [role="group"][aria-label*="what you haven"]',
    );
    return [...(wall?.children ?? [])].map((grid) => {
      const element = grid as HTMLElement;
      return {
        gap: Number.parseFloat(getComputedStyle(element).rowGap) || 0,
        heading: element.querySelector('h3')?.textContent ?? null,
        tiles: [...element.children]
          .filter(
            (child): child is HTMLElement =>
              child instanceof HTMLElement &&
              child.tagName !== 'H3' &&
              child.offsetHeight > 0 &&
              Boolean(child.dataset.episodeTile ?? child.dataset.stackEpisodes),
          )
          .map((tile) => {
            const box = tile.getBoundingClientRect();
            return {
              bottom: Math.round(box.bottom),
              code: tile.dataset.episodeTile ?? 'stack',
              focus: tile.dataset.focusLayout ?? null,
              left: Math.round(box.left),
              right: Math.round(box.right),
              stack: Number(tile.dataset.stackEpisodes ?? 0),
              top: Math.round(box.top),
            };
          }),
        watched: element.dataset.wallGroup === 'watched',
      };
    });
  });

const code = (n: number) => `S01E${String(n).padStart(2, '0')}`;

async function expectBalanced(page: Page, watched: ReadonlyArray<number>) {
  // Focus settles in with a short scale: measure the
  // boxes once it is done, not mid-animation.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => animation.playState !== 'running'),
  );
  const groups = await wallGroups(page);
  for (const group of groups) {
    for (const tile of group.tiles) {
      const above = group.tiles.filter(
        (other) =>
          other !== tile &&
          other.bottom <= tile.top &&
          other.left < tile.right - 2 &&
          other.right > tile.left + 2,
      );
      if (above.length) {
        const nearest = Math.max(...above.map((other) => other.bottom));
        expect(
          tile.top - nearest,
          `hole above ${tile.code}`,
        ).toBeLessThanOrEqual(group.gap + 2);
      }
    }
    // A tall Focus is 2 × 2 on the desktop's three columns only; on tablets
    // and phones it spans the row.
    const desktop = (page.viewportSize()?.width ?? 0) >= 1024;
    const focus = group.tiles.find((tile) => tile.focus === 'tall');
    if (focus && desktop) {
      const beside = group.tiles.filter(
        (tile) => tile.left >= focus.right && tile.top < focus.bottom,
      );
      expect(beside).toHaveLength(2);
      expect(
        Math.abs(Math.max(...beside.map((tile) => tile.bottom)) - focus.bottom),
      ).toBeLessThanOrEqual(2);
    }
  }
  const main = groups.filter((group) => !group.watched);
  const seen = groups.filter((group) => group.watched);
  for (const group of main) {
    for (const n of watched) {
      expect(group.tiles.map((tile) => tile.code)).not.toContain(code(n));
    }
  }
  if (!watched.length) {
    expect(seen).toHaveLength(0);
    return;
  }
  expect(seen).toHaveLength(1);
  const counted = /(\d+) watched/.exec(seen[0]?.heading ?? '');
  const items = (seen[0]?.tiles ?? []).reduce(
    (sum, tile) => sum + (tile.stack || 1),
    0,
  );
  expect(Number(counted?.[1])).toBe(watched.length);
  expect(items).toBe(watched.length);
}

async function openWall(
  page: Page,
  id: number,
  watched: ReadonlyArray<number>,
) {
  await page.goto(`/${id}/x`);
  const wall = page
    .getByTestId('route-show')
    .locator('[role="group"][aria-label*="what you haven"]');
  await expect(wall).toBeVisible();
  if (watched.length) {
    await expect(wall.locator('[data-wall-group="watched"]')).toBeVisible();
  }
  await fontsSettled(page);
}

// The composition itself is unit-tested (`episodes/wall.ts`): these check
// that the browser lays it out, a tall Focus on the desktop's three columns
// and a wide one on a phone.
const CASES = [
  {
    focus: 'tall',
    id: 920_010,
    name: 'ten, every other one watched',
    watched: [2, 4, 6, 8, 10],
    width: 1440,
  },
  {
    focus: 'wide',
    id: 920_004,
    name: 'four, E3 and E4 watched',
    watched: [3, 4],
    width: 390,
  },
] as const;

test.describe('the episode wall holds together on small and odd seasons', () => {
  for (const wallCase of CASES) {
    test(`${wallCase.name} (${wallCase.width}px)`, async ({
      context,
      page,
    }) => {
      await page.setViewportSize({ height: 1000, width: wallCase.width });
      await phoneScrollbars(page, wallCase.width);
      await signInAs(context, 'nina');
      await markWatched('nina', wallCase.id, 1, wallCase.watched);
      await openWall(page, wallCase.id, wallCase.watched);
      await expectBalanced(page, wallCase.watched);
      await expect(page.locator('[data-focus-layout]')).toHaveAttribute(
        'data-focus-layout',
        wallCase.focus,
      );
    });
  }

  {
    const width = 390;
    const label = 'Show all 13 episodes';
    test(`Show all shows the whole season at once, no pager (${width}px)`, async ({
      context,
      page,
    }) => {
      await page.setViewportSize({ height: 1000, width });
      await phoneScrollbars(page, width);
      await signInAs(context, 'nina');
      await markWatched('nina', 920_013, 1, [13]);
      await openWall(page, 920_013, [13]);
      const wall = page
        .getByTestId('route-show')
        .locator('[role="group"][aria-label*="what you haven"]');
      const visibleTiles = wall.locator('[data-episode-tile]:visible');
      const showAll = wall.getByRole('button', { name: label });
      await expect(showAll).toHaveAttribute('aria-expanded', 'false');
      const folded = await showAll.boundingBox();
      // the wall streams and hydrates after the page: a press before that is lost
      await expectHydrated(showAll);
      await showAll.click();
      // E1 Focus + E2–E12 open + E13 in the watched group: all 13.
      await expect(visibleTiles).toHaveCount(13);
      await expect(
        wall.getByRole('button', { name: /^Show (all|\d+ more)/ }),
      ).toHaveCount(0);
      await expect(
        wall.getByRole('button', { name: /Next episodes|Previous episodes/ }),
      ).toHaveCount(0);
      // Scrolled to the end, nothing else appears; Show fewer folds back.
      await wall
        .locator('[data-episode-tile="S01E12"]')
        .scrollIntoViewIfNeeded();
      await expect(visibleTiles).toHaveCount(13);
      // One button in both states: same size, the chevron turned.
      const fewer = wall.getByRole('button', { name: 'Show fewer' });
      await expect(fewer).toHaveAttribute('aria-expanded', 'true');
      const open = await fewer.boundingBox();
      expect(open?.width).toBe(folded?.width);
      expect(open?.height).toBe(folded?.height);
      await fewer.click();
      await expect(visibleTiles).toHaveCount(3);
      await expect(wall.getByRole('button', { name: label })).toBeFocused();
    });
  }

  test('marking from a wide Focus moves it on and keeps one watched group', async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ height: 1000, width: 1440 });
    await signInAs(context, 'nina');
    await markWatched('nina', 920_004, 1, [3, 4]);
    await openWall(page, 920_004, [3, 4]);
    await expect(page.locator('header .animate-pulse')).toHaveCount(0);
    await page
      .getByRole('button', { name: /Mark S01E01 watched/ })
      .first()
      .click();
    // Focus moves to E2 at once; E1 joins the group, which now counts 3.
    await expect(page.locator('[data-focus-layout]')).toHaveAttribute(
      'data-episode-tile',
      'S01E02',
    );
    await expect(page.locator('[data-wall-group="watched"] h3')).toHaveText(
      /3 watched/i,
    );
    await expectBalanced(page, [1, 3, 4]);
  });
});

/**
 * Holds every server action (the marks stay optimistic, nothing settles)
 * until `release()`: what a press does while its write is still out.
 */
async function holdActions(page: Page) {
  const held: Array<() => Promise<void>> = [];
  let holding = true;
  await page.route('**/*', (route) => {
    const request = route.request();
    if (request.method() !== 'POST' || !request.headers()['next-action']) {
      return route.fallback();
    }
    if (!holding) {
      return route.continue();
    }
    held.push(() => route.continue());
  });
  return async () => {
    holding = false;
    await Promise.all(held.splice(0).map((go) => go()));
  };
}

const centre = async (page: Page, selector: string) => {
  await page.locator(selector).scrollIntoViewIfNeeded();
  const box = await page.locator(selector).boundingBox();
  if (!box) {
    throw new Error(`no box for ${selector}`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

test.describe('controls never slide under the pointer', () => {
  test('a double-click on Show opens the stack and unmarks nothing', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    // alex has watched all of Season 1: one stack of eight
    await page.goto('/136315/the-bear?season=1');
    const show = page.getByRole('button', { exact: true, name: 'Show' });
    await show.dblclick();
    await expect(page.locator('[data-episode-tile="S01E02"]')).toBeVisible();
    await expect(page.getByText(/unmarked|Unmarked/)).toHaveCount(0);
    await expect(
      page.locator('[data-episode-tile="S01E02"] button[aria-pressed="true"]'),
    ).toHaveCount(1);
  });

  test('a double-click where an unmarked eye was unmarks only that one', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await page.goto('/136315/the-bear?season=1');
    await page.getByRole('button', { exact: true, name: 'Show' }).click();
    const { x, y } = await centre(
      page,
      '[data-episode-tile="S01E04"] button[aria-pressed="true"]',
    );
    // unmark E04; the second click lands on what moved in there
    await page.mouse.dblclick(x, y);
    await expect(page.getByText(/S01E04 .*unmarked/)).toBeVisible();
    // only E04: seven of eight still watched (the rest re-fold into stacks)
    await expect(
      page.getByRole('group', { name: /^Season 1: 7 of 8 watched/ }),
    ).toBeVisible();
  });

  test('a tap where an eye was, while its write is out, presses nothing else', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await page.goto('/136315/the-bear?season=1');
    await page.getByRole('button', { exact: true, name: 'Show' }).click();
    const release = await holdActions(page);
    const { x, y } = await centre(
      page,
      '[data-episode-tile="S01E04"] button[aria-pressed="true"]',
    );
    // two single clicks (a double-tap reports no click count)
    await page.mouse.click(x, y);
    await page.mouse.click(x, y);
    await release();
    await expect(page.getByText(/S01E04 .*unmarked/)).toBeVisible();
    await expect(
      page.getByRole('group', { name: /^Season 1: 7 of 8 watched/ }),
    ).toBeVisible();
  });

  for (const how of ['double-click', 'tap while out'] as const) {
    test(`Next up: a ${how} marks one episode, not the next one too`, async ({
      context,
      page,
    }) => {
      await page.setViewportSize({ height: 1000, width: 1440 });
      await signInAs(context, 'nina');
      await markWatched('nina', 920_004, 1, [3, 4]);
      await openWall(page, 920_004, [3, 4]);
      await expect(page.locator('header .animate-pulse')).toHaveCount(0);
      const release = how === 'tap while out' ? await holdActions(page) : null;
      const pill = page
        .getByRole('button', { name: /^Mark S01E01 watched/ })
        .first();
      await pill.scrollIntoViewIfNeeded();
      const box = await pill.boundingBox();
      if (!box) {
        throw new Error('no Next up pill');
      }
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      if (release) {
        await page.mouse.click(x, y);
        // the pill now reads "Mark S01E02 watched" in the same spot
        await expect(
          page.getByRole('button', { name: /^Mark S01E02 watched/ }),
        ).toBeVisible();
        await page.mouse.click(x, y);
        await release();
      } else {
        await page.mouse.dblclick(x, y);
      }
      await expect(page.getByText(/^Marked S01E01(?!–)/)).toBeVisible();
      await expect(page.locator('[data-focus-layout]')).toHaveAttribute(
        'data-episode-tile',
        'S01E02',
      );
      // what the server saved: E1 only
      await page.waitForLoadState('networkidle');
      await openWall(page, 920_004, [1, 3, 4]);
      await expect(page.locator('[data-focus-layout]')).toHaveAttribute(
        'data-episode-tile',
        'S01E02',
      );
      await expect(page.locator('[data-wall-group="watched"] h3')).toHaveText(
        /3 watched/i,
      );
    });
  }
});

/**
 * Every tile keeps its own bottom padding under its last line
 * (20px on an episode tile, 24px on Next up): on a tile the wall
 * gives a fixed height (364px from md, two of them beside a tall Focus) the
 * still gives way, never the padding; Next up's still also takes any spare
 * height, so its text never sits over a hole. Measured on long titles and
 * overviews at 1440 and on a Next up without a synopsis on a phone.
 */
const lastLineGaps = (page: Page) =>
  page.evaluate(() => {
    const wall = document.querySelector(
      '[data-testid="route-show"] [role="group"][aria-label*="what you haven"]',
    );
    const tiles = [
      ...(wall?.querySelectorAll<HTMLElement>(
        '[data-episode-tile], [data-stack-episodes]',
      ) ?? []),
    ].filter((tile) => tile.offsetHeight > 0);
    return tiles.map((tile) => {
      const heading = tile.querySelector('h4, b');
      const body = heading?.parentElement ?? tile;
      const texts = [...body.querySelectorAll<HTMLElement>('*')].filter(
        (element) =>
          !element.closest('[aria-hidden="true"]') &&
          element.getClientRects().length > 0 &&
          [...element.childNodes].some(
            (node) =>
              node.nodeType === Node.TEXT_NODE &&
              (node.textContent ?? '').trim() !== '',
          ),
      );
      const last = Math.max(
        ...texts.map((element) => element.getBoundingClientRect().bottom),
      );
      const still = tile.firstElementChild?.getBoundingClientRect();
      return {
        code:
          tile.dataset.episodeTile ?? `stack of ${tile.dataset.stackEpisodes}`,
        // Focus with its still above the text (tall, or wide below lg)
        focusStacked: Boolean(
          tile.dataset.focusLayout &&
            still &&
            still.bottom <= body.getBoundingClientRect().top + 1,
        ),
        gap: Math.round(tile.getBoundingClientRect().bottom - last),
        inset: Number.parseFloat(getComputedStyle(body).paddingBottom) || 0,
      };
    });
  });

const PADDING_CASES = [
  { id: 920_103, name: 'long titles and overviews', watched: [], width: 1440 },
  { id: 920_102, name: 'Next up without a synopsis', watched: [1], width: 390 },
] as const;

test.describe('every tile keeps its bottom padding under its last line', () => {
  for (const wallCase of PADDING_CASES) {
    test(`${wallCase.name} (${wallCase.width}px)`, async ({
      context,
      page,
    }) => {
      await page.setViewportSize({ height: 1000, width: wallCase.width });
      await phoneScrollbars(page, wallCase.width);
      await signInAs(context, 'nina');
      await markWatched('nina', wallCase.id, 1, wallCase.watched);
      await openWall(page, wallCase.id, wallCase.watched);
      await page.waitForFunction(() =>
        document
          .getAnimations()
          .every((animation) => animation.playState !== 'running'),
      );
      const gaps = await lastLineGaps(page);
      expect(gaps.length).toBeGreaterThan(0);
      for (const tile of gaps) {
        expect(
          tile.gap,
          `${tile.code}: last line ${tile.gap}px above the bottom (padding ${tile.inset}px)`,
        ).toBeGreaterThanOrEqual(tile.inset - 1);
        // Next up's text holds the room of a two-line synopsis and no
        // more: under a missing one, its two lines and their gap (60px)
        if (tile.focusStacked) {
          expect(
            tile.gap,
            `${tile.code} (Next up): ${tile.gap}px under its last line`,
          ).toBeLessThanOrEqual(tile.inset + 62);
        }
      }
    });
  }
});

test("Next up's pill stays in its spot when the next synopsis is shorter (390px)", async ({
  context,
  page,
}) => {
  await page.setViewportSize({ height: 1000, width: 390 });
  await phoneScrollbars(page, 390);
  await signInAs(context, 'nina');
  // the no-stills lab: E2 has no synopsis, E3 a one-line one
  await markWatched('nina', 920_102, 1, [1]);
  await openWall(page, 920_102, [1]);
  const pill = (code: string) =>
    page.getByRole('button', { name: new RegExp(`^Mark ${code} watched`) });
  // Focus settles in with a short scale: measure it at rest, both times
  const settled = () =>
    page.waitForFunction(() =>
      document
        .getAnimations()
        .every((animation) => animation.playState !== 'running'),
    );
  // the pill's place in the Focus tile (the page may scroll as the wall
  // reflows under it)
  const place = (code: string) =>
    pill(code).evaluate((node) => {
      const tile = node.closest('[data-focus-layout]')?.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      return { x: box.x - (tile?.x ?? 0), y: box.y - (tile?.y ?? 0) };
    });
  await expect(pill('S01E02')).toBeVisible();
  await settled();
  const before = await place('S01E02');
  await pill('S01E02').click();
  await expect(pill('S01E03')).toBeVisible();
  await settled();
  const after = await place('S01E03');
  // within a pixel (sub-pixel rounding of the settled tile)
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  // on a phone the pill's left edge sits over "Next up"
  const pillBox = await pill('S01E03').boundingBox();
  const labelBox = await page.getByText('Next up · S01E03').boundingBox();
  expect(Math.abs((pillBox?.x ?? 0) - (labelBox?.x ?? -9))).toBeLessThanOrEqual(
    1,
  );
});
