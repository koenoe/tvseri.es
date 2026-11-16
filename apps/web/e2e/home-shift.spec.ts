import { expect, type Page, test } from '@playwright/test';

import {
  CLS_LIMIT,
  readShifts,
  SHIFT_OBSERVER,
  TOLERANCE,
} from './helpers/parity';
import { setLibraryHint, signInAs, stubFault } from './helpers/session';

/**
 * Home's viewer-dependent blocks keep their box from the first paint to
 * the end, for a signed-in viewer too (the pre-paint script picks the
 * placeholder: `data-home`, the signed-in rule). The days are pinned through
 * `/dev/home?day=` (served in the e2e build only).
 */

/** Sun 15 Nov 2026: Versus for everyone (not an If you liked X day) */
const VERSUS_DAY = '/dev/home?day=2026-11-15';

/** Tue 10 Nov 2026: If you liked X signed in, Where are they set? signed out */
const IF_YOU_LIKED_DAY = '/dev/home?day=2026-11-10';

/** The visible placeholders other than `except`, by name */
const visiblePlaceholders = (page: Page, except: string) =>
  page.evaluate(
    (name) =>
      [...document.querySelectorAll('[data-placeholder]')]
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => element.getAttribute('data-placeholder'))
        .filter((placeholder) => placeholder !== name),
    except,
  );

/** The first visible element that matches, its size and name */
const visibleBox = (page: Page, selector: string, attribute: string) =>
  page.evaluate(
    ([css, name]) => {
      const element = [...document.querySelectorAll(css)].find(
        (candidate) => candidate.getClientRects().length > 0,
      );
      if (!element) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      return {
        height: Math.round(rect.height),
        name: element.getAttribute(name),
        width: Math.round(rect.width),
      };
    },
    [selector, attribute] as const,
  );

test.describe('home: nothing moves for a signed-in viewer', () => {
  test.use({ viewport: { height: 900, width: 1440 } });

  test('Versus holds its box while the viewer’s library loads', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await setLibraryHint(context, 'alex', [136315]);
    // the library answers only once the toy is on screen
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/me/library-ids', async (route) => {
      await gate;
      await route.fallback();
    });
    await page.addInitScript(SHIFT_OBSERVER);
    await page.goto(VERSUS_DAY);
    // every other section has arrived
    await expect
      .poll(() => visiblePlaceholders(page, 'toy'), { timeout: 30_000 })
      .toEqual([]);
    await page.evaluate(() => document.fonts.ready);

    // the toy's place at the top of the screen, the row under it in view
    // (the section above it ends 80px down)
    await page.evaluate(() => {
      const card = document.querySelector('[data-slot="toy"]');
      const above = card?.previousElementSibling;
      const top = above
        ? above.getBoundingClientRect().bottom + window.scrollY - 80
        : 0;
      window.scrollTo(0, top);
    });
    const held = await visibleBox(
      page,
      '[data-placeholder="toy"]',
      'data-placeholder',
    );
    await page.evaluate(() => {
      (window as unknown as { __shifts: unknown[] }).__shifts.length = 0;
    });

    release();
    const versus = page.getByRole('region', { name: 'Versus' });
    await expect(versus).toBeVisible();
    await page.waitForTimeout(400);

    const loaded = await visibleBox(page, '[data-slot="toy"]', 'data-slot');
    const { cls, shifts } = await readShifts(page);
    console.log(
      `versus signed in: held ${JSON.stringify(held)} loaded ${JSON.stringify(loaded)} cls ${cls.toFixed(4)}\n${shifts.join('\n')}`,
    );
    expect(held, 'no placeholder held the card’s box').not.toBeNull();
    expect(
      Math.abs((held?.height ?? 0) - (loaded?.height ?? 0)),
    ).toBeLessThanOrEqual(TOLERANCE);
    expect(cls, 'layout shift when the library arrived').toBeLessThan(
      CLS_LIMIT,
    );
  });

  test('a new viewer holds the toy’s box on an If you liked day, not that card’s', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'nina');
    await setLibraryHint(context, 'nina', []);
    // what the pre-paint script sets on `/` for a viewer whose library is
    // empty (`htmlHints.ts`); `/dev/home` is not `/`, so it is set here
    // (the document has no <html> yet when this runs: watch for it too)
    await context.addInitScript(() => {
      const mark = () => {
        const root = document.documentElement;
        if (root && root.getAttribute('data-home') !== 'new') {
          root.setAttribute('data-home', 'new');
        }
      };
      new MutationObserver(mark).observe(document, {
        attributeFilter: ['data-home'],
        attributes: true,
        childList: true,
        subtree: true,
      });
      mark();
    });
    // a new viewer has no show to start If you liked X from (the stub's
    // card is the same for everyone), and the viewer's holes take a while
    await stubFault('nina', {
      body: { items: [], source: null },
      includes: '/me/home/if-you-liked',
      mode: 'answer',
    });
    await stubFault('nina', { delayMs: 4000, mode: 'slow', path: '/me' });
    // not to `load`: that waits for the whole stream, the holes filled
    await page.goto(IF_YOU_LIKED_DAY, { waitUntil: 'commit' });

    const placeholder = page.locator('[data-placeholder^="toy"]:visible');
    await expect(placeholder).toHaveCount(1, { timeout: 30_000 });
    const held = await visibleBox(
      page,
      '[data-placeholder^="toy"]',
      'data-placeholder',
    );
    await expect(page.locator('[data-slot="toy"]')).toBeVisible({
      timeout: 30_000,
    });
    const loaded = await visibleBox(page, '[data-slot^="toy"]', 'data-slot');
    console.log(
      `new viewer, If you liked day: held ${JSON.stringify(held)} loaded ${JSON.stringify(loaded)}`,
    );
    expect(held?.name).toBe('toy');
    expect(loaded?.name).toBe('toy');
    expect(
      Math.abs((held?.height ?? 0) - (loaded?.height ?? 0)),
    ).toBeLessThanOrEqual(TOLERANCE);
  });
});
