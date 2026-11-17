import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';
import { type StubViewer, signInAs } from './helpers/session';
import { clientSize, untilStable } from './helpers/viewport';

/**
 * The toast's one place (Toaster.tsx), also while a layer is open (the
 * Remote's popover or sheet, the history sheet): at
 * 1440 bottom right of the window, 24px in from the right (of the room the
 * scrollbar leaves) and the bottom, as wide as its content (280 to 720px);
 * full width 16px in, 40px up at 390.
 * It never hops while the layer it came from closes, and its Undo takes the
 * click.
 */

const HEIGHT = 900;

/**
 * The card's insets from the window's right and bottom (inside its
 * scrollbar); its width: the room less `inset * 2` (`full`), or at least its
 * 280px minimum and under the 720px cap (a mark toast is short: as wide as
 * its content, which depends on the machine's font).
 */
const CAP = 720;
const EXPECTED = {
  390: { bottom: 40, full: true, min: 0, right: 16 },
  1440: { bottom: 24, full: false, min: 280, right: 24 },
} as const;

type Trigger = Readonly<{
  name: string;
  viewer: StubViewer;
  widths: ReadonlyArray<390 | 1440>;
  open: (page: Page) => Promise<void>;
}>;

const markNextFromRemote = async (page: Page) => {
  await page
    .getByRole('menuitem', { name: /Watched next episode/ })
    .first()
    .click();
};

const TRIGGERS: ReadonlyArray<Trigger> = [
  {
    name: 'the show hero’s Remote',
    open: async (page) => {
      await open(page, '/136315/the-bear');
      await page
        .getByRole('button', { name: 'More actions for The Bear' })
        .filter({ visible: true })
        .first()
        .click();
      await markNextFromRemote(page);
    },
    viewer: 'alex',
    widths: [1440, 390],
  },
];

/**
 * The first toast's top, every frame, until `stopWatching` (read back with
 * `tops`): one element, so a later toast (an error) doesn't count as a hop.
 */
const watchToast = (page: Page) =>
  page.evaluate(() => {
    const state = window as unknown as {
      toastStop?: boolean;
      toastTops: number[];
    };
    state.toastTops = [];
    let first: Element | null = null;
    const frame = () => {
      first ??= document.querySelector('[data-sonner-toast]');
      if (first?.isConnected) {
        state.toastTops.push(first.getBoundingClientRect().top);
      }
      if (!state.toastStop) {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  });

const stopWatching = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as { toastStop: boolean }).toastStop = true;
  });

const tops = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { toastTops: number[] }).toastTops ?? [],
  );

for (const trigger of TRIGGERS) {
  for (const width of trigger.widths) {
    test(`${trigger.name} (${width}px): the toast at its one place`, async ({
      context,
      page,
    }) => {
      await page.setViewportSize({ height: HEIGHT, width });
      await signInAs(context, trigger.viewer);
      await trigger.open(page);
      await watchToast(page);
      const toast = page.locator('[data-sonner-toast]').first();
      await expect(toast).toBeVisible();
      // any layer's exit is over, and the rise (0.3s) with it
      await expect(page.getByRole('menu')).toHaveCount(0);
      await expect(page.locator('dialog[open]')).toHaveCount(0);
      await expect
        .poll(async () => (await tops(page)).length)
        .toBeGreaterThanOrEqual(30);
      await stopWatching(page);
      // hovering holds the toast (sonner pauses its timer) and needs it on top
      await toast.hover();

      const box = await toast.boundingBox();
      const room = await clientSize(page);
      const expected = EXPECTED[width];
      expect(Math.round((box?.x ?? 0) + (box?.width ?? 0))).toBe(
        room.width - expected.right,
      );
      const full = room.width - expected.right * 2;
      if (expected.full) {
        expect(box?.width).toBe(full);
      } else {
        expect(box?.width).toBeGreaterThanOrEqual(expected.min);
        expect(box?.width).toBeLessThan(CAP);
      }
      expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(
        room.height - expected.bottom,
      );

      // It only ever rises into place: no hop down when a layer closes.
      const seen = await tops(page);
      for (let i = 1; i < seen.length; i += 1) {
        expect(seen[i]!, `frame ${i}`).toBeLessThanOrEqual(seen[i - 1]! + 0.5);
      }

      // Its controls are above everything and take the click (Home's mark
      // toast can lose its Undo once the row has moved on: then ×).
      const live = page.locator(
        '[data-sonner-toast]:not([data-removed="true"])',
      );
      await live
        .getByRole('button', { name: /^(Undo|Try again|Dismiss)$/ })
        .first()
        .click();
      await expect(live.getByText(/^Marked /)).toHaveCount(0);
    });
  }
}

test('over the open history sheet the toast keeps its place, inside the sheet', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ height: HEIGHT, width: 1440 });
  await signInAs(context, 'alex');
  await open(page, '/136315/the-bear?history&season=3');
  const sheet = page.getByRole('dialog', { name: 'Watch history' });
  await sheet.getByRole('button', { name: 'Tap marks' }).click();
  await sheet
    .getByRole('region', { name: 'Season 3' })
    .locator('[data-chip="4"]')
    .click();
  const toast = page.locator('[data-sonner-toast]').first();
  await expect(toast).toBeVisible();
  await toast.hover();
  const [box, panel, room] = await Promise.all([
    toast.boundingBox(),
    sheet.boundingBox(),
    clientSize(page),
  ]);
  expect(Math.round((box?.x ?? 0) + (box?.width ?? 0))).toBe(room.width - 24);
  expect(box?.x ?? 0).toBeGreaterThanOrEqual(panel?.x ?? 0);
});

// A toast raised from the ⋯ sheet that stays open (Add to watchlist)
// was drawn over the sheet's own action tiles. It rises above the sheet.
test('on a phone the toast rises above the open ⋯ sheet', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await signInAs(context, 'alex');
  await open(page, '/136315/the-bear');
  await page
    .getByRole('button', { name: 'More actions for The Bear' })
    .filter({ visible: true })
    .first()
    .click();
  // the panel: the dialog's second child (after the dim; the toast host
  // moves in after it)
  const sheet = page.locator('dialog[open] > div').nth(1);
  await page.getByRole('menuitemcheckbox', { name: /watchlist/ }).click();
  const toast = page.locator('[data-sonner-toast]').first();
  await expect(toast).toBeVisible();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  // the toast's rise and the sheet's entry are over
  await untilStable(
    () => Promise.all([toast.boundingBox(), sheet.boundingBox()]),
    { message: 'the toast and the sheet settle' },
  );
  const sheetBox = await sheet.boundingBox();
  const box = await toast.boundingBox();
  expect(sheetBox && box).toBeTruthy();
  if (sheetBox && box) {
    expect(box.y + box.height).toBeLessThanOrEqual(sheetBox.y - 4);
  }
});
