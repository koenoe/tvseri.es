import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';

/**
 * A visitor who asks for reduced motion (`prefers-reduced-motion: reduce`)
 * gets every state at once: Motion's moves and layout morphs are instant
 * (`MotionProvider`'s `reducedMotion="user"`; opacity still fades), CSS
 * transitions and animations finish at once (globals.css), and a row's
 * arrows jump instead of scrolling smoothly (`RowArrows`).
 */

test.use({ reducedMotion: 'reduce', viewport: { height: 900, width: 1440 } });

type Probe =
  | Readonly<{ kind: 'transform'; selector: string }>
  | Readonly<{ id: string; kind: 'scrollLeft' }>;

/**
 * Samples `probe` on every frame from now until the returned `stop` is
 * called, in the page; frames where its element is missing are skipped.
 */
const sampleFrames = async (page: Page, probe: Probe) => {
  await page.evaluate((what) => {
    const values: unknown[] = [];
    const w = window as unknown as { __run: boolean; __values: unknown[] };
    w.__values = values;
    w.__run = true;
    const read = () => {
      if (what.kind === 'scrollLeft') {
        return document.getElementById(what.id)?.scrollLeft ?? null;
      }
      const element = document.querySelector(what.selector);
      return element ? getComputedStyle(element).transform : null;
    };
    const tick = () => {
      const value = read();
      if (value !== null) {
        values.push(value);
      }
      if (w.__run) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }, probe);
  return () =>
    page.evaluate(() => {
      const w = window as unknown as { __run: boolean; __values: unknown[] };
      w.__run = false;
      return w.__values;
    });
};

test('the desktop menu panel jumps into place, with no slide', async ({
  page,
}) => {
  await open(page, '/discover');
  const stop = await sampleFrames(page, {
    kind: 'transform',
    selector: '[data-menu-panel]',
  });
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('[data-menu-panel]')).toBeVisible();
  await page.waitForTimeout(400);
  const transforms = (await stop()) as string[];
  const atPlace = (value: string) =>
    value === 'none' || value === 'matrix(1, 0, 0, 1, 0, 0)';
  // Motion mounts the panel at its entry offset (off screen, its width to
  // the right) and moves it on the next frame: at most that one place,
  // never one in between
  const offPlace = new Set(transforms.filter((value) => !atPlace(value)));
  expect(transforms.some(atPlace)).toBe(true);
  expect(offPlace.size).toBeLessThanOrEqual(1);
  expect(atPlace(transforms.at(-1) ?? '')).toBe(true);
});

test('a tile’s hover grow and the CSS transitions finish at once', async ({
  page,
}) => {
  await open(page, '/discover');
  const durations = await page.evaluate(() =>
    // the tiles' grow (`tileHover`)
    [
      ...document.querySelectorAll<HTMLElement>(
        'main [class*="hover:scale-10"]',
      ),
    ]
      .slice(0, 40)
      .map((link) => getComputedStyle(link).transitionDuration),
  );
  expect(durations.length).toBeGreaterThan(0);
  for (const duration of durations) {
    for (const part of duration.split(',')) {
      expect(Number.parseFloat(part)).toBeLessThan(0.001);
    }
  }
});

test('a row’s Next arrow jumps, with no smooth scroll in between', async ({
  page,
}) => {
  await open(page, '/discover');
  const next = page.getByRole('button', { name: /^Next: / }).first();
  await next.scrollIntoViewIfNeeded();
  const railId = (await next.getAttribute('aria-controls')) ?? '';
  expect(railId).not.toBe('');
  const stop = await sampleFrames(page, { id: railId, kind: 'scrollLeft' });
  await next.click();
  await page.waitForTimeout(600);
  const offsets = (await stop()) as number[];
  const moving = [...new Set(offsets)];
  // the start and the end, nothing between
  expect(moving.length).toBe(2);
  expect(moving[0]).toBe(0);
});
