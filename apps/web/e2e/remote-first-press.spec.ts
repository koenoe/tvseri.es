import { expect, type Locator, type Page, test } from '@playwright/test';

import { type StubViewer, setLibraryHint, signInAs } from './helpers/session';

/**
 * The lazy ⋯ opens its Remote on the first press, on a page loaded fresh:
 * the Remote's code is held back after the page has loaded, so the press
 * lands before the code does. One press, one open: a click at 1440, a tap at
 * 390, Enter on the focused ⋯ (one input per surface). It once
 * took two under `next dev`: StrictMode's re-run of the new Remote's
 * effects closed the menu the first press had just opened.
 */

type Surface = Readonly<{
  name: string;
  path: string;
  viewer: StubViewer;
  /** The surface's ⋯ buttons */
  more: (page: Page) => Locator;
  /** How it is pressed (a History row's ⋯ is hover-only: no tap) */
  inputs: ReadonlyArray<'click' | 'enter' | 'tap'>;
  /** Home's Continue watching: the viewer's in-progress hint */
  hint?: ReadonlyArray<number>;
}>;

const MORE = /^More actions for/;

const SURFACES: ReadonlyArray<Surface> = [
  {
    inputs: ['click'],
    more: (page) =>
      page.locator('[data-diary]').getByRole('button', { name: MORE }),
    name: 'a History row',
    path: '/u/alex/history',
    viewer: 'alex',
  },
  {
    inputs: ['enter', 'tap'],
    more: (page) =>
      page
        .getByRole('region', { name: 'Out now' })
        .getByRole('button', { name: MORE }),
    name: 'a profile lane row',
    path: '/u/alex',
    viewer: 'alex',
  },
  {
    hint: [136315],
    inputs: ['click'],
    more: (page) =>
      page
        .locator('[data-slot="continue"]')
        .getByRole('button', { name: MORE }),
    name: "Home's Continue watching",
    path: '/',
    viewer: 'kit',
  },
];

/**
 * Every chunk asked for from now on arrives `ms` late; `held()` counts
 * them, to prove the Remote's code was not in before the press.
 */
async function holdLateChunks(page: Page, ms: number) {
  let held = 0;
  await page.route('**/_next/static/chunks/*.js', async (route) => {
    held += 1;
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });
  return () => held;
}

/** The surface's first visible ⋯, on a page whose own code is all in */
async function freshMore(page: Page, surface: Surface, delay: number) {
  await signInAs(page.context(), surface.viewer);
  if (surface.hint) {
    await setLibraryHint(page.context(), surface.viewer, surface.hint);
  }
  await page.goto(surface.path);
  const more = surface.more(page).filter({ visible: true }).first();
  await more.scrollIntoViewIfNeeded();
  await expect(more).toBeVisible();
  await page.waitForLoadState('networkidle');
  const held = await holdLateChunks(page, delay);
  return { held, more };
}

const menuFor = async (page: Page, more: Locator) => {
  const name = (await more.getAttribute('aria-label')) ?? '';
  return page.getByRole('menu', {
    name: name.replace(MORE, 'Actions for'),
  });
};

/**
 * Open, from code loaded after the page (cold), and still open a while
 * later: one open, not an open and a close
 */
async function expectOpenOnce(page: Page, menu: Locator, held: () => number) {
  await expect(menu).toBeVisible();
  expect(held()).toBeGreaterThan(0);
  await page.waitForTimeout(600);
  await expect(menu).toBeVisible();
}

type TriggerState = 'busy' | 'gone' | 'idle' | 'open';

/**
 * From now on, how the pressed ⋯ reads each frame (it is swapped for the
 * Remote's own ⋯ meanwhile, in the same row): `stop()` gives the frames.
 */
async function watchTrigger(more: Locator) {
  await more.evaluate((button) => {
    const row = button.parentElement?.parentElement;
    const name = button.getAttribute('aria-label') ?? '';
    const frames: TriggerState[] = [];
    const tick = () => {
      const current = [...(row?.querySelectorAll('button') ?? [])].find(
        (candidate) => candidate.getAttribute('aria-label') === name,
      );
      frames.push(
        !current
          ? 'gone'
          : current.getAttribute('aria-expanded') === 'true'
            ? 'open'
            : current.hasAttribute('aria-busy')
              ? 'busy'
              : 'idle',
      );
      if (frames.length < 150) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
    Object.assign(window, { remoteFrames: frames });
  });
  return () =>
    more
      .page()
      .evaluate(
        () =>
          (window as unknown as { remoteFrames: TriggerState[] }).remoteFrames,
      );
}

/** Once the ⋯ reads pressed, it never reads idle again before it opens */
function expectPressedThroughout(frames: ReadonlyArray<TriggerState>) {
  const first = frames.findIndex((frame) => frame !== 'idle');
  expect(first).toBeGreaterThanOrEqual(0);
  expect(
    frames.slice(first).filter((frame) => frame !== 'busy' && frame !== 'open'),
  ).toEqual([]);
  expect(frames).toContain('open');
}

for (const surface of SURFACES) {
  test.describe(`the ⋯ on ${surface.name}, first press`, () => {
    test.describe('at 1440', () => {
      test.use({ viewport: { height: 900, width: 1440 } });

      if (surface.inputs.includes('click')) {
        test('a click opens the Remote (code 400ms late)', async ({ page }) => {
          const { held, more } = await freshMore(page, surface, 400);
          const menu = await menuFor(page, more);
          const frames = await watchTrigger(more);
          await more.click();
          await expectOpenOnce(page, menu, held);
          expectPressedThroughout(await frames());
          await expect(
            page.getByRole('button', { expanded: true, name: MORE }),
          ).toHaveCount(1);
        });
      }

      if (surface.inputs.includes('enter')) {
        test('Enter opens it on the big key; Escape gives focus back to the ⋯', async ({
          page,
        }) => {
          const { held, more } = await freshMore(page, surface, 400);
          const menu = await menuFor(page, more);
          const name = (await more.getAttribute('aria-label')) ?? '';
          await more.focus();
          await page.keyboard.press('Enter');
          await expectOpenOnce(page, menu, held);
          await expect(menu.getByRole('menuitem').first()).toBeFocused();
          await page.keyboard.press('Escape');
          await expect(menu).toHaveCount(0);
          await expect(
            page.getByRole('button', { expanded: false, name }),
          ).toBeFocused();
        });
      }
    });

    test.describe('at 390', () => {
      test.use({ hasTouch: true, viewport: { height: 844, width: 390 } });

      if (surface.inputs.includes('tap')) {
        test("a tap opens the Remote's sheet (code 400ms late)", async ({
          page,
        }) => {
          const { held, more } = await freshMore(page, surface, 400);
          const menu = await menuFor(page, more);
          const frames = await watchTrigger(more);
          await more.tap();
          await expectOpenOnce(page, menu, held);
          expectPressedThroughout(await frames());
          await expect(menu).toHaveAttribute('data-layout', 'sheet');
        });
      }
    });
  });
}
