import { expect, type Page, test } from '@playwright/test';

import { TOLERANCE } from './helpers/parity';
import { signInAs } from './helpers/session';

/**
 * Versus, the toy of the day (HMFinal "H · Versus"). Sun 15 Nov 2026 plans
 * it for everyone (not an If you liked X day), so the page is pinned there
 * through `/dev/home?day=` (served in the e2e build only). The stub's deck
 * (`fixtures/home/toy.ts`): Dark and Devs first; The Bear in the second
 * pair (signed in, the spec's library has it in progress).
 */
const DAY = '/dev/home?day=2026-11-15';

const card = (page: Page) => page.getByRole('region', { name: 'Versus' });
const poster = (page: Page, name: string) =>
  card(page).getByRole('button', { exact: true, name });
/** The left poster's name: which pair is on screen */
const leftTitle = async (page: Page) =>
  (
    (await card(page).locator('button[aria-pressed]').first().textContent()) ??
    ''
  ).trim();
const hint = (page: Page) =>
  card(page).getByText('Tap the one you would start');

/** Holds every server action: list writes stay optimistic, nothing settles */
const holdWrites = (page: Page) =>
  page.route('**/*', (route) =>
    route.request().method() === 'POST' &&
    route.request().headers()['next-action']
      ? undefined
      : route.fallback(),
  );

test.describe('Versus', () => {
  test('signed out: the pair, the comparison and the line without “you haven’t seen either”', async ({
    page,
  }) => {
    await page.goto(DAY);
    await expect(card(page)).toBeVisible();
    await expect(
      card(page).getByRole('heading', {
        level: 2,
        name: 'Similar. Which first?',
      }),
    ).toBeVisible();
    await expect(poster(page, 'Dark')).toHaveAttribute('aria-pressed', 'false');
    await expect(poster(page, 'Devs')).toBeVisible();
    const score = card(page).getByRole('row').first();
    await expect(score).toHaveText(/^8\.4\s*Score\s*7\.6$/);
    await expect(hint(page)).toBeVisible();
  });

  test('tapping a poster dims the other and brings the actions; again clears', async ({
    page,
  }) => {
    await page.goto(DAY);
    await card(page).scrollIntoViewIfNeeded();
    // y within the card, so a scroll can't move it
    const within = async (locator: ReturnType<Page['locator']>) => {
      const [box, frame] = await Promise.all([
        locator.boundingBox(),
        card(page).boundingBox(),
      ]);
      return {
        height: Math.round(box?.height ?? -1),
        y: Math.round((box?.y ?? 0) - (frame?.y ?? 0)),
      };
    };
    const another = card(page).getByRole('button', { name: 'Another pair' });
    const resultBefore = await within(hint(page).locator('..'));
    const anotherBefore = await within(another);

    await poster(page, 'Dark').click();
    await expect(poster(page, 'Dark')).toHaveAttribute('aria-pressed', 'true');
    await expect(poster(page, 'Devs')).toHaveCSS('opacity', '0.4');
    const open = card(page).getByRole('link', { name: 'Open Dark' });
    await expect(open).toHaveAttribute('href', '/70523/dark');
    await expect(
      card(page).getByRole('button', { name: 'Add Dark to your watchlist' }),
    ).toHaveText('Watchlist');
    // the actions take the hint's row: nothing under it moves
    expect(await within(open.locator('../..'))).toEqual(resultBefore);
    expect(await within(another)).toEqual(anotherBefore);

    await poster(page, 'Devs').click();
    await expect(
      card(page).getByRole('link', { name: 'Open Devs' }),
    ).toBeVisible();
    await expect(poster(page, 'Dark')).toHaveCSS('opacity', '0.4');

    await poster(page, 'Devs').click();
    await expect(hint(page)).toBeVisible();
    await expect(poster(page, 'Dark')).toHaveCSS('opacity', '1');
  });

  test('works from the keyboard', async ({ page }) => {
    await page.goto(DAY);
    await poster(page, 'Dark').focus();
    await page.keyboard.press('Enter');
    await expect(poster(page, 'Dark')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Tab');
    await expect(
      card(page).getByRole('link', { name: 'Open Dark' }),
    ).toBeFocused();
    await poster(page, 'Devs').focus();
    await page.keyboard.press('Space');
    await expect(poster(page, 'Devs')).toHaveAttribute('aria-pressed', 'true');
    await card(page).getByRole('button', { name: 'Another pair' }).focus();
    await page.keyboard.press('Enter');
    await expect(poster(page, 'The Bear')).toBeVisible();
  });

  test('“Another pair” steps through the deck and back to the first', async ({
    page,
  }) => {
    await page.goto(DAY);
    const another = card(page).getByRole('button', { name: 'Another pair' });
    const seen: string[] = [];
    for (let step = 0; step < 6; step++) {
      seen.push(await leftTitle(page));
      await another.click();
    }
    expect(seen).toEqual([
      'Dark',
      'The Bear',
      'Severance',
      'Slow Horses',
      'Line of Duty',
      '12 Monkeys',
    ]);
    await expect(poster(page, 'Dark')).toBeVisible();
  });

  test('signed out, Watchlist asks to sign in', async ({ page }) => {
    await page.goto(DAY);
    await poster(page, 'Dark').click();
    await card(page)
      .getByRole('button', { name: /^Add .+ to your watchlist$/ })
      .click();
    await expect(
      page.getByText('Please sign in to use this feature'),
    ).toBeVisible();
  });

  test('signed in: the line says so, a pair already seen is left out, Watchlist adds', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await holdWrites(page);
    // the viewer's library: The Bear in progress (the rig's own viewers
    // track invented shows)
    await page.route('**/api/me/library-ids', (route) =>
      route.fulfill({
        json: {
          favorites: [],
          inProgress: [136315],
          watched: [],
          watchlist: [],
        },
      }),
    );
    await page.goto(DAY);
    await expect(
      card(page).getByRole('heading', {
        level: 2,
        name: 'Similar, and you haven’t seen either. Which first?',
      }),
    ).toBeVisible();

    // five pairs: The Bear's is not among them
    const another = card(page).getByRole('button', { name: 'Another pair' });
    const firsts: string[] = [];
    for (let step = 0; step < 5; step++) {
      firsts.push(await leftTitle(page));
      await another.click();
    }
    expect(firsts).not.toContain('The Bear');
    expect(firsts[0]).toBe('Dark');
    await expect(poster(page, 'Dark')).toBeVisible();

    await poster(page, 'Dark').click();
    await card(page)
      .getByRole('button', { name: 'Add Dark to your watchlist' })
      .click();
    await expect(
      card(page).getByRole('button', {
        name: 'Remove Dark from your watchlist',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    // the pair stays while the viewer acts on it
    await expect(poster(page, 'Dark')).toHaveAttribute('aria-pressed', 'true');
  });
});

for (const viewport of [
  { height: 900, width: 1440 },
  { height: 900, width: 1100 },
  { height: 1000, width: 800 },
  { height: 844, width: 390 },
] as const) {
  test(`the placeholder has the card's boxes at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/dev/home');
    await expect(
      page.locator('#toy-ghost-versus [data-placeholder]'),
    ).toBeAttached();
    const boxes = await page.evaluate(() => {
      const parts = (root: string) => {
        const frame = document.querySelector(`#${root} > div`);
        const origin = frame?.getBoundingClientRect();
        const box = (element: Element | null | undefined) => {
          const rect = element?.getBoundingClientRect();
          return rect && origin
            ? {
                height: Math.round(rect.height),
                width: Math.round(rect.width),
                x: Math.round(rect.x - origin.x),
                y: Math.round(rect.y - origin.y),
              }
            : null;
        };
        const card = frame?.querySelector(':scope > div > *');
        const middle = card?.children[1];
        return {
          card: box(card),
          heading: box(frame?.querySelector('h2')),
          left: box(card?.children[0]),
          more: box(middle?.children[3]),
          result: box(middle?.children[2]),
          right: box(card?.children[2]),
          rows: box(middle?.children[1]),
        };
      };
      return { ghost: parts('toy-ghost-versus'), loaded: parts('toy-versus') };
    });
    for (const [part, loaded] of Object.entries(boxes.loaded)) {
      const ghost = boxes.ghost[part as keyof typeof boxes.ghost];
      expect(loaded, part).not.toBeNull();
      for (const side of ['x', 'y', 'width', 'height'] as const) {
        expect(
          Math.abs((loaded?.[side] ?? 0) - (ghost?.[side] ?? -99)),
          `${part} ${side}`,
        ).toBeLessThanOrEqual(TOLERANCE);
      }
    }
  });
}
