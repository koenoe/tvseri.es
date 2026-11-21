import { expect, type Page, test } from '@playwright/test';

import { open, openFromHeader, dialog as searchDialog } from './search';
import { signInAs } from './session';

/**
 * The strips iOS Safari 26 colours its status bar and the band under its
 * toolbar from (`EdgeTint`): on a phone they carry the open panel's ground,
 * the top one only when the panel is full screen; on desktop they are not
 * there for Safari to read. Shared by the Chromium and WebKit specs.
 */

const WHITE = 'rgb(255, 255, 255)';
const NONE = 'rgba(0, 0, 0, 0)';

/** Each strip of the open dialog: shown or not, and its colour */
const strips = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('dialog[open] > [data-edge-tint]')].map(
      (strip) => {
        const style = getComputedStyle(strip);
        const box = strip.getBoundingClientRect();
        return {
          colour: style.backgroundColor,
          edge: box.top === 0 ? 'top' : 'bottom',
          shown: style.display !== 'none',
        };
      },
    ),
  );

type Strip = Readonly<{ colour: string; edge: string; shown: boolean }>;

/**
 * From now until search unmounts, samples the closing dialog's strips on
 * every frame (before it paints), so a close of any length is read whole
 * rather than at one moment a busy machine can miss.
 */
const recordClosingStrips = (page: Page) =>
  page.evaluate(() => {
    const frames: Strip[][] = [];
    (window as unknown as { __closingStrips: Strip[][] }).__closingStrips =
      frames;
    const read = (dialog: Element) =>
      [...dialog.querySelectorAll(':scope > [data-edge-tint]')].map((strip) => {
        const style = getComputedStyle(strip);
        return {
          colour: style.backgroundColor,
          edge: strip.getBoundingClientRect().top === 0 ? 'top' : 'bottom',
          shown: style.display !== 'none',
        };
      });
    const sample = () => {
      const dialog = document.querySelector('dialog[aria-label="Search"]');
      if (!dialog) {
        return;
      }
      if (dialog.hasAttribute('data-closing')) {
        frames.push(read(dialog));
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    // and the moment the close starts, before any frame: a fast close on a
    // slow runner (CI's WebKit) can end between two sampled frames
    const dialog = document.querySelector('dialog[aria-label="Search"]');
    if (dialog) {
      const watch = new MutationObserver(() => {
        if (dialog.hasAttribute('data-closing')) {
          frames.push(read(dialog));
          watch.disconnect();
        }
      });
      watch.observe(dialog, { attributeFilter: ['data-closing'] });
    }
  });

const closingStrips = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __closingStrips: Strip[][] }).__closingStrips,
  );

/** The ground the open dialog's panel paints */
const panelGround = (page: Page) =>
  page.evaluate(() => {
    const panel = document.querySelector(
      'dialog[open] > div:not([data-dialog-backdrop]):not([data-edge-tint])',
    );
    return panel ? getComputedStyle(panel).backgroundColor : '';
  });

export function edgeTintSuite() {
  test.describe('a phone dialog gives iOS Safari its colours', () => {
    test.use({ hasTouch: true, viewport: { height: 844, width: 390 } });

    test('the ⋯ sheet: white at the bottom, the top left to Safari', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.goto('/u/alex/library/watchlist');
      const tile = page.locator('[data-slot="library-grid"] ul > li').first();
      await tile.getByRole('button', { name: /^More actions for/ }).tap();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(await strips(page)).toEqual([
        { colour: NONE, edge: 'top', shown: true },
        { colour: WHITE, edge: 'bottom', shown: true },
      ]);
    });

    test('the watch history, full screen: its ground at both edges', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.goto('/136315/the-bear?history');
      await expect(
        page.getByRole('dialog', { name: 'Watch history' }),
      ).toBeVisible();
      const ground = await panelGround(page);
      expect(ground).not.toBe(NONE);
      expect(await strips(page)).toEqual([
        { colour: ground, edge: 'top', shown: true },
        { colour: ground, edge: 'bottom', shown: true },
      ]);
    });

    test('search, full screen: white at both edges', async ({ page }) => {
      await open(page);
      await openFromHeader(page);
      await expect(searchDialog(page)).toBeVisible();
      expect(await strips(page)).toEqual([
        { colour: WHITE, edge: 'top', shown: true },
        { colour: WHITE, edge: 'bottom', shown: true },
      ]);
      // as it fades out, the bars go back to the page colour at once: every
      // frame of the close (the dialog carries `data-closing` until it
      // unmounts) shows the page colour at both edges
      const ground = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      );
      await recordClosingStrips(page);
      await page.keyboard.press('Escape');
      // inert while it closes, so out of the accessibility tree: by its tag
      await expect(page.locator('dialog[aria-label="Search"]')).toHaveCount(0);
      const frames = await closingStrips(page);
      expect(frames.length).toBeGreaterThan(0);
      for (const frame of frames) {
        expect(frame).toEqual([
          { colour: ground, edge: 'top', shown: true },
          { colour: ground, edge: 'bottom', shown: true },
        ]);
      }
    });
  });

  test.describe('desktop dialogs leave Safari alone', () => {
    test.use({ viewport: { height: 900, width: 1440 } });

    test('the watch history and search have no strips', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.goto('/136315/the-bear?history');
      await expect(
        page.getByRole('dialog', { name: 'Watch history' }),
      ).toBeVisible();
      expect((await strips(page)).map((strip) => strip.shown)).toEqual([
        false,
        false,
      ]);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await open(page);
      await openFromHeader(page);
      expect((await strips(page)).map((strip) => strip.shown)).toEqual([
        false,
        false,
      ]);
    });
  });
}
