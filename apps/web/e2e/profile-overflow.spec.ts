import { expect, type Page, test } from '@playwright/test';

import {
  findOverflow,
  formatProblems,
  openCappedLists,
} from './helpers/overflow';
import { type StubViewer, signInAs } from './helpers/session';
import { fontsSettled, pageSettled, phoneScrollbars } from './helpers/viewport';

/**
 * The profile overview holds real, heavy data: no sideways scroll, no text outside its card, no
 * value cut without an ellipsis, equal rows where the board draws them, at
 * a phone, a tablet, 1440 and a big screen. The heavy profile
 * (`marathonwatcher-2026`) is checked with every capped lane open too.
 */

const WIDTHS = [390, 800, 1440, 1728] as const;
/** The overview also at a small phone (the boards draw 390), both profiles */
const OVERVIEW_WIDTHS = [360, ...WIDTHS] as const;

const CASES: ReadonlyArray<
  Readonly<{ name: string; path: string; viewer: StubViewer; open?: true }>
> = [
  {
    name: 'heavy owner',
    open: true,
    path: '/u/marathonwatcher-2026',
    viewer: 'marathonwatcher-2026',
  },
  { name: 'heavy, visited', path: '/u/marathonwatcher-2026', viewer: 'alex' },
  { name: 'medium owner', open: true, path: '/u/mira', viewer: 'mira' },
  { name: 'new user', path: '/u/nina', viewer: 'nina' },
];

/** Every block has arrived: the last one is on the page and nothing loads */
async function arrived(page: Page) {
  await expect(
    page.getByRole('heading', { name: 'Recently watched' }),
  ).toBeVisible();
  await pageSettled(page);
}

for (const width of OVERVIEW_WIDTHS) {
  test.describe(`profile overflow at ${width}px`, () => {
    test.use({ viewport: { height: width < 500 ? 844 : 900, width } });
    test.beforeEach(async ({ page }) => {
      await phoneScrollbars(page, width);
    });

    for (const { name, open, path, viewer } of CASES) {
      test(name, async ({ context, page }) => {
        await signInAs(context, viewer);
        await page.goto(path);
        await arrived(page);
        const problems = await findOverflow(page);
        expect(problems, formatProblems(problems)).toEqual([]);
        if (open) {
          await openCappedLists(page);
          const opened = await findOverflow(page);
          expect(opened, formatProblems(opened)).toEqual([]);
        }
      });
    }
  });
}

test('a busy profile stays short: lanes list what the board draws', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await signInAs(context, 'marathonwatcher-2026');
  await page.goto('/u/marathonwatcher-2026');
  await arrived(page);
  const pageHeight = () =>
    page.evaluate(() => document.documentElement.scrollHeight);
  const capped = await pageHeight();
  // 22 shows catching up, 28 paused: one and three listed, the rest in place
  const catching = page.getByRole('region', { name: 'Catching up' });
  await expect(catching.getByRole('listitem')).toHaveCount(1);
  await expect(
    catching.getByRole('button', { name: 'Show all 22' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Paused' }).getByRole('button', {
      name: 'Show all 28',
    }),
  ).toBeVisible();
  // 11,540px with every lane open, under 4,600 capped: the caps keep the
  // page under 40% of its open height
  await openCappedLists(page);
  await expect(catching.getByRole('listitem')).toHaveCount(22);
  const opened = await pageHeight();
  expect(capped, `${capped}px capped, ${opened}px open`).toBeLessThan(
    opened * 0.4,
  );
});

// Beside the sidebar at tablet width the Recently watched
// tiles once shrank to a fifth of ~370px while their code chips did not,
// and the header's arrows pushed "History" past the column. Tablets have no
// sidebar now; 1024 is the narrowest column beside it. The scan above skips
// rails (scrollers), so the tile and the header are measured here.
for (const width of [800, 1024] as const) {
  test(`Recently watched keeps chips in their tiles and History in the column at ${width}px`, async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ height: 900, width });
    await phoneScrollbars(page, width);
    await signInAs(context, 'marathonwatcher-2026');
    await page.goto('/u/marathonwatcher-2026');
    await arrived(page);
    const section = page.locator('section[aria-labelledby="recently-watched"]');
    const tooWide = await section
      .locator('#recently-watched-rail > li')
      .evaluateAll((slots) =>
        slots.flatMap((slot) => {
          const tile = slot.getBoundingClientRect();
          return Array.from(slot.querySelectorAll('span'))
            .filter(
              (chip) =>
                chip.childElementCount === 0 &&
                /^S\d+E\d+/.test(chip.textContent ?? ''),
            )
            .map((chip) => chip.getBoundingClientRect())
            .filter((chip) => chip.width > tile.width + 1)
            .map((chip) => `${chip.width}px chip in a ${tile.width}px tile`);
        }),
      );
    expect(tooWide).toEqual([]);
    const column = await section.boundingBox();
    const history = await section
      .getByRole('link', { name: 'History' })
      .boundingBox();
    expect(column && history).toBeTruthy();
    if (column && history) {
      expect(history.x + history.width).toBeLessThanOrEqual(
        column.x + column.width + 1,
      );
    }
  });
}

/** History: the heavy diary, its own and visited, at every width */
for (const width of WIDTHS) {
  for (const viewer of ['marathonwatcher-2026', 'alex'] as const) {
    test(`heavy History as ${viewer} holds its text at ${width}px`, async ({
      context,
      page,
    }) => {
      await page.setViewportSize({ height: width < 500 ? 844 : 900, width });
      await phoneScrollbars(page, width);
      await signInAs(context, viewer);
      await page.goto('/u/marathonwatcher-2026/history');
      await expect(
        page.locator('[data-diary] section[data-month]').first(),
      ).toBeVisible();
      await pageSettled(page);
      const problems = await findOverflow(page);
      expect(problems, formatProblems(problems)).toEqual([]);
    });
  }
}

// At tablet width (no sidebar below lg) a title keeps room to
// be read, not a few letters and an ellipsis
test('History at 800px leaves every row title room', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 800 });
  await signInAs(context, 'marathonwatcher-2026');
  await page.goto('/u/marathonwatcher-2026/history');
  await fontsSettled(page);
  const rows = page.locator('[data-diary-row]');
  await expect(rows.first()).toBeVisible();
  // its title column keeps a share of the row (100px of ~736 at 800),
  // whatever the scrollbar takes
  const shares = await rows.evaluateAll((nodes) =>
    nodes.slice(0, 20).map((row) => {
      const title = row.querySelector('.truncate')?.parentElement;
      return (
        (title?.getBoundingClientRect().width ?? 0) /
        row.getBoundingClientRect().width
      );
    }),
  );
  expect(Math.min(...shares), shares.join(', ')).toBeGreaterThanOrEqual(0.135);
});

// A run's "N episodes" toggle and a visitor's + once
// shared the code line's width: the code ran under the toggle (390), the
// runtime and "Marked in one go" under it and the + (800), the title cut to
// three letters. No two of a row's parts may overlap.
for (const width of [360, 390, 800, 1023, 1024, 1440] as const) {
  for (const viewer of ['marathonwatcher-2026', 'alex'] as const) {
    test(`History rows as ${viewer} keep their parts apart at ${width}px`, async ({
      context,
      page,
    }) => {
      await page.setViewportSize({ height: width < 500 ? 844 : 900, width });
      await phoneScrollbars(page, width);
      await signInAs(context, viewer);
      await page.goto('/u/marathonwatcher-2026/history');
      const rows = page.locator('[data-diary-row]');
      await expect(rows.first()).toBeVisible();
      await pageSettled(page);
      const clashes = await rows.evaluateAll((nodes) =>
        nodes.slice(0, 30).flatMap((row) => {
          const grid = row.firstElementChild;
          if (!grid) return [];
          const parts = Array.from(
            grid.querySelectorAll('a, button, span, b, div'),
          ).filter((node) => {
            if (node.childElementCount > 0 && node.tagName !== 'BUTTON') {
              return false;
            }
            const box = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return (
              box.width > 0 &&
              box.height > 0 &&
              style.visibility !== 'hidden' &&
              Number(style.opacity) > 0.15 &&
              (node.textContent ?? '').trim() !== ''
            );
          });
          const clipper = (node: Element) =>
            node.closest('[class*="overflow-clip"]');
          const shown = parts.filter((node) => {
            const box = node.getBoundingClientRect();
            const clip = clipper(node)?.getBoundingClientRect();
            return !clip || box.top < clip.bottom - 1;
          });
          const found: string[] = [];
          for (let a = 0; a < shown.length; a += 1) {
            for (let b = a + 1; b < shown.length; b += 1) {
              const one = shown[a];
              const two = shown[b];
              if (!one || !two || one.contains(two) || two.contains(one)) {
                continue;
              }
              const x = one.getBoundingClientRect();
              const y = two.getBoundingClientRect();
              const overlapX =
                Math.min(x.right, y.right) - Math.max(x.left, y.left);
              const overlapY =
                Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
              if (overlapX > 1 && overlapY > 1) {
                found.push(
                  `"${one.textContent?.trim()}" over "${two.textContent?.trim()}"`,
                );
              }
            }
          }
          return found;
        }),
      );
      expect(clashes).toEqual([]);
    });
  }
}

// Circle with real-sized data: 100 follows with long handles (the cap's
// line), long show titles, every level; and someone else's lists
const CIRCLE_CASES: ReadonlyArray<
  Readonly<{ name: string; path: string; viewer: StubViewer }>
> = [
  {
    name: 'heavy owner',
    path: '/u/marathonwatcher-2026/circle',
    viewer: 'marathonwatcher-2026',
  },
  { name: 'owner', path: '/u/alex/circle', viewer: 'alex' },
  { name: 'visited', path: '/u/juno/circle', viewer: 'alex' },
];

for (const width of WIDTHS) {
  test.describe(`Circle overflow at ${width}px`, () => {
    test.use({ viewport: { height: width < 500 ? 844 : 900, width } });
    test.beforeEach(async ({ page }) => {
      await phoneScrollbars(page, width);
    });

    for (const { name, path, viewer } of CIRCLE_CASES) {
      test(name, async ({ context, page }) => {
        await signInAs(context, viewer);
        await page.goto(path);
        await expect(page.locator('[data-person]').first()).toBeVisible();
        await pageSettled(page);
        const problems = await findOverflow(page);
        expect(problems, formatProblems(problems)).toEqual([]);
      });
    }
  });
}

// Phones: a lane card's header link sits under
// the title, on the title's left edge, in every lane card. A row's title has the
// row's width before its secondary facts (Almost done's "1 to go", Paused's
// Keep and Hide, Coming up's service logo, Waiting for's "31 days to go");
// the circle switcher's names stay readable. A Library
// tile's fact drops whole or ends with an ellipsis, never cut mid-word.
for (const width of [360, 390] as const) {
  test(`phone lanes: one header rule, titles before facts at ${width}px`, async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });
    await phoneScrollbars(page, width);
    await signInAs(context, 'marathonwatcher-2026');
    await page.goto('/u/marathonwatcher-2026');
    await arrived(page);
    const heads = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll('section[aria-labelledby].rounded-16 > div'),
      )
        .filter((head) => head.querySelector(':scope > h2'))
        .flatMap((head) => {
          const title = head.querySelector(':scope > h2');
          const link = title?.parentElement?.lastElementChild;
          if (
            !title ||
            !link ||
            link === title ||
            link.childElementCount === 0
          ) {
            return [];
          }
          const t = title.getBoundingClientRect();
          const l = link.getBoundingClientRect();
          if (l.width === 0 || !link.textContent?.trim()) return [];
          return [
            {
              below: l.top >= t.bottom - 1,
              dx: Math.round(
                (
                  link.querySelector('a, button, span') ?? link
                ).getBoundingClientRect().left - t.left,
              ),
              name: title.textContent,
            },
          ];
        }),
    );
    expect(heads.length).toBeGreaterThan(3);
    for (const head of heads) {
      expect(head, `${head.name}`).toMatchObject({ below: true, dx: 0 });
    }
    // titles: whole, or cut only after most of the row
    const cut = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          [
            'section[aria-labelledby="almost-done"] a.truncate',
            'section[aria-labelledby="paused"] a.truncate',
            'section[aria-labelledby="v3-cu"] span.truncate.font-semibold',
            'section[aria-labelledby="b-wf"] span.truncate.font-semibold',
          ].join(', '),
        ),
      )
        .filter((title) => title.scrollWidth > title.clientWidth + 1)
        // a cut title has its line to itself: nothing else in the row is
        // drawn beside it (a 360 row's text column is ~116-136px, all of it
        // the title's)
        .filter((title) => {
          const t = title.getBoundingClientRect();
          const row = title.parentElement?.closest(
            'a, div.grid, div.flex.items-center',
          );
          return Array.from(row?.querySelectorAll('*') ?? []).some((other) => {
            if (
              other === title ||
              other.contains(title) ||
              title.contains(other)
            ) {
              return false;
            }
            const o = other.getBoundingClientRect();
            const style = getComputedStyle(other);
            return (
              o.width > 0 &&
              style.visibility !== 'hidden' &&
              other.childElementCount === 0 &&
              (other.tagName === 'IMG' ||
                (other.textContent ?? '').trim() !== '') &&
              o.left >= t.right - 1 &&
              o.top < t.bottom &&
              o.bottom > t.top
            );
          });
        })
        .map((title) => `${title.textContent} beside a fact`),
    );
    expect(cut).toEqual([]);
    const chips = await page
      .getByRole('group', { name: 'Picks' })
      .getByRole('button')
      .evaluateAll((buttons) =>
        buttons
          .filter((button) => button.scrollWidth > button.clientWidth + 1)
          .filter((button) => button.clientWidth < 120)
          .map((button) => button.textContent),
      );
    expect(chips).toEqual([]);
  });

  for (const shelf of ['watching', 'finished'] as const) {
    test(`Library ${shelf} tiles keep their facts whole at ${width}px`, async ({
      context,
      page,
    }) => {
      await page.setViewportSize({ height: 844, width });
      await phoneScrollbars(page, width);
      await signInAs(context, 'marathonwatcher-2026');
      await page.goto(`/u/marathonwatcher-2026/library/${shelf}`);
      await expect(
        page.locator('[data-slot="library-tile"]').first(),
      ).toBeVisible();
      await pageSettled(page);
      const problems = await findOverflow(page);
      expect(problems, formatProblems(problems)).toEqual([]);
      // a shown fact is whole or ends in an ellipsis after a readable stretch
      const fragments = await page
        .locator('[data-slot="library-tile"]')
        .evaluateAll((tiles) =>
          tiles.slice(0, 12).flatMap((tile) =>
            Array.from(tile.querySelectorAll('span.text-ellipsis'))
              .filter((text) => {
                const line = text.closest('.overflow-clip');
                if (!line) return false;
                const box = text.getBoundingClientRect();
                return box.top < line.getBoundingClientRect().bottom;
              })
              .filter((text) => text.scrollWidth > text.clientWidth + 1)
              .filter((text) => text.clientWidth < 60)
              .map((text) => `${text.textContent} in ${text.clientWidth}px`),
          ),
        );
      expect(fragments).toEqual([]);
    });
  }
}
