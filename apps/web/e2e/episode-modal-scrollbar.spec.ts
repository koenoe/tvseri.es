import { expect, test } from '@playwright/test';

import { open } from './helpers';
import { signInAs } from './helpers/session';
import { untilStable } from './helpers/viewport';

/**
 * Opening the episode modal flashes no scroll bar: while its content
 * settles (the faces' placeholder holds two rows; an episode without guest
 * stars lands one shorter), its scroller never turns scrollable and then
 * back. A window shorter than that placeholder is where it showed.
 */

const SHOW = '/136315/the-bear';

test('opening the modal from a tile flashes no scroll bar', async ({
  context,
  page,
}) => {
  await signInAs(context, 'alex');
  await page.setViewportSize({ height: 600, width: 1440 });
  await open(page, SHOW);
  await expect(page.locator('[data-placeholder]')).toHaveCount(0);
  // alex's wall opens on season 3
  const tile = page.getByRole('button', { name: /^Open S03E0/ }).first();
  await page.evaluate(() => {
    const state = window as unknown as { scrollable: boolean[] };
    state.scrollable = [];
    const frame = () => {
      const scroller = document.querySelector<HTMLElement>(
        'dialog [data-dialog-scroller]',
      );
      if (scroller) {
        const { overflowY } = getComputedStyle(scroller);
        state.scrollable.push(
          (overflowY === 'auto' || overflowY === 'scroll') &&
            scroller.scrollHeight > scroller.clientHeight,
        );
      }
      if (state.scrollable.length < 120) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await tile.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // the faces have landed and the panel is still
  await expect(dialog.locator('[data-person]').first()).toBeAttached();
  await untilStable(
    () => dialog.locator('[data-dialog-scroller]').boundingBox(),
    {
      message: 'the modal grows in and stops',
    },
  );
  const seen = await page.evaluate(
    () => (window as unknown as { scrollable: boolean[] }).scrollable,
  );
  expect(seen.length).toBeGreaterThan(0);
  const flips = seen.filter(
    (now, index) => index > 0 && seen[index - 1] && !now,
  );
  expect(flips, `scrollable per frame: ${seen.join(',')}`).toEqual([]);
});
