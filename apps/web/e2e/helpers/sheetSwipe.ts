import { expect, type Locator, type Page, test } from '@playwright/test';

import { signInAs } from './session';
import { untilStable } from './viewport';

/**
 * Swipe down to close a phone bottom sheet (`useSheetSwipe`), shared by the
 * Chromium and WebKit specs. The swipe is a run of touch pointer events
 * dispatched in the page on the clock, so it plays the same in both
 * engines (Playwright has no touch drag); how the browser hands a real
 * finger over (scrolling, `pointercancel`) is the device's to check.
 */

type Swipe = Readonly<{ dy: number; ms: number }>;

/** Swipes from the middle of `from` by `dy` px over `ms`; the panel's top per frame back */
async function swipe(from: Locator, { dy, ms }: Swipe): Promise<number[]> {
  return from.evaluate(
    async (element, { dy, ms }) => {
      const box = element.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const init = (clientY: number) => ({
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY,
        isPrimary: true,
        pointerId: 7,
        pointerType: 'touch',
      });
      const frame = () =>
        new Promise<number>((resolve) => requestAnimationFrame(resolve));
      const panel = () =>
        document.querySelector(
          'dialog[open] > div:not([data-dialog-backdrop]):not([data-edge-tint])',
        );
      const tops: number[] = [];
      // On the clock, in one task: a move every 16ms and the release `ms`
      // after the press, whatever the machine. Paced by animation frames, a
      // slow runner's first frame alone took longer than a flick's 80ms, so
      // the flick arrived too slow to close
      element.dispatchEvent(new PointerEvent('pointerdown', init(y)));
      const start = performance.now();
      let due = start + 16;
      let t = 0;
      while (t < 1) {
        const now = performance.now();
        t = Math.min(1, (now - start) / ms);
        if (now >= due || t === 1) {
          element.dispatchEvent(
            new PointerEvent('pointermove', init(y + dy * t)),
          );
          due += 16;
        }
      }
      element.dispatchEvent(new PointerEvent('pointerup', init(y + dy)));
      // the settle or the exit, frame by frame
      const end = performance.now() + 900;
      while (performance.now() < end) {
        const node = panel();
        if (!node) {
          break;
        }
        tops.push(Math.round(node.getBoundingClientRect().top));
        await frame();
      }
      return tops;
    },
    { dy, ms },
  );
}

const panelTranslate = (page: Page) =>
  page.evaluate(
    () =>
      (
        document.querySelector(
          'dialog[open] > div:not([data-dialog-backdrop]):not([data-edge-tint])',
        ) as HTMLElement | null
      )?.style.translate ?? null,
  );

/**
 * The open sheet's entry has played: its panel has held its place and its
 * look for 200ms (a swipe that starts mid-entry fights the entry's motion).
 */
const entered = (page: Page) =>
  untilStable(
    () =>
      page.evaluate(() => {
        const node = document.querySelector(
          'dialog[open] > div:not([data-dialog-backdrop]):not([data-edge-tint])',
        );
        if (!node) {
          return null;
        }
        const { top, height } = node.getBoundingClientRect();
        return [
          Math.round(top),
          Math.round(height),
          getComputedStyle(node).opacity,
          getComputedStyle(node).transform,
        ];
      }),
    { message: 'the sheet has come in' },
  );

const nonDecreasing = (values: ReadonlyArray<number>) =>
  values.every((value, i) => i === 0 || value >= (values[i - 1] ?? value));

export function sheetSwipeSuite() {
  test.describe('a phone sheet closes with a swipe down', () => {
    test.use({ hasTouch: true, viewport: { height: 844, width: 390 } });

    const openRemote = async (page: Page) => {
      await page.goto('/u/alex/library/watchlist');
      const tile = page.locator('[data-slot="library-grid"] ul > li').first();
      await tile.getByRole('button', { name: /^More actions for/ }).tap();
      const sheet = page.getByRole('dialog');
      await expect(sheet).toBeVisible();
      await entered(page);
      return sheet;
    };
    /** The ⋯ sheet's grab handle: the top of the panel */
    const handle = (sheet: Locator) =>
      sheet.locator('span[aria-hidden]').first();

    test.beforeEach(async ({ context }) => {
      await signInAs(context, 'alex');
    });

    test('past a quarter of its height it leaves from where the finger let go', async ({
      page,
    }) => {
      const sheet = await openRemote(page);
      const height =
        (await handle(sheet).evaluate(
          (node) => node.parentElement?.getBoundingClientRect().height,
        )) ?? 0;
      const tops = await swipe(handle(sheet), {
        dy: Math.round(height * 0.4),
        ms: 900,
      });
      await expect(page.getByRole('dialog')).toHaveCount(0);
      // no jump back up: it keeps going down until it is gone
      expect(tops.length).toBeGreaterThan(2);
      expect(nonDecreasing(tops)).toBe(true);
    });

    test('a short, slow swipe settles back and presses nothing', async ({
      page,
    }) => {
      const sheet = await openRemote(page);
      const firstKey = sheet.locator('[data-remote-key]').first();
      await swipe(firstKey, { dy: 30, ms: 600 });
      await expect(sheet).toBeVisible();
      await expect.poll(() => panelTranslate(page)).toBe('');
      await expect(sheet.getByRole('menu')).toBeVisible();
    });

    test('a flick closes it, however short', async ({ page }) => {
      const sheet = await openRemote(page);
      await swipe(handle(sheet), { dy: 60, ms: 80 });
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    test('a swipe up leaves the sheet where it is', async ({ page }) => {
      const sheet = await openRemote(page);
      const tops = await swipe(handle(sheet), { dy: -200, ms: 300 });
      await expect(sheet).toBeVisible();
      expect(await panelTranslate(page)).toBe('');
      expect(new Set(tops).size).toBe(1);
    });

    test('opens again in place after a swipe closed it', async ({ page }) => {
      const sheet = await openRemote(page);
      await swipe(handle(sheet), { dy: 200, ms: 300 });
      await expect(page.getByRole('dialog')).toHaveCount(0);
      const again = await openRemote(page);
      await expect.poll(() => panelTranslate(page)).toBe('');
      const box = await handle(again).boundingBox();
      expect(box?.y ?? 0).toBeLessThan(844);
    });

    test('the full-screen watch history: a swipe on its header leaves it open', async ({
      page,
    }) => {
      await page.goto('/136315/the-bear?history');
      const sheet = page.getByRole('dialog', { name: 'Watch history' });
      await expect(sheet).toBeVisible();
      await entered(page);
      await swipe(sheet.getByRole('heading', { name: 'Watch history' }), {
        dy: 300,
        ms: 300,
      });
      await expect(sheet).toBeVisible();
      expect(await panelTranslate(page)).toBe('');
    });
  });

  test.describe('desktop dialogs have no swipe', () => {
    test.use({ viewport: { height: 900, width: 1440 } });

    test('the watch history stays put', async ({ context, page }) => {
      await signInAs(context, 'alex');
      await page.goto('/136315/the-bear?history');
      const sheet = page.getByRole('dialog', { name: 'Watch history' });
      await expect(sheet).toBeVisible();
      await entered(page);
      await swipe(sheet.getByRole('heading', { name: 'Watch history' }), {
        dy: 300,
        ms: 200,
      });
      await expect(sheet).toBeVisible();
      expect(await panelTranslate(page)).toBe('');
    });
  });
}
