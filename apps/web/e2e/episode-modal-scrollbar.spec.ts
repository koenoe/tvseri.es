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

/**
 * The card grows with its content scaled past the panel's box; the panel
 * must not scroll to the ✕ `showModal()` focuses out there. A scrolled panel
 * drew the content off centre and snapped back as the grow settled.
 * Meanwhile the page and the header behind stay where they were.
 */
test('the growing card stays centred and nothing behind it moves', async ({
  context,
  page,
}) => {
  await signInAs(context, 'alex');
  await page.setViewportSize({ height: 900, width: 1440 });
  await open(page, SHOW);
  await expect(page.locator('[data-placeholder]')).toHaveCount(0);
  const tile = page.getByRole('button', { name: /^Open S03E0/ }).first();
  // the click's own scroll would move the page before the modal opens
  await tile.scrollIntoViewIfNeeded();
  await untilStable(() => page.locator('header').first().boundingBox(), {
    message: 'the header settles after the scroll',
  });
  await page.evaluate(() => {
    type Sample = Readonly<{ offset: number; header: string; page: string }>;
    const samples: Sample[] = [];
    (window as unknown as { samples: Sample[] }).samples = samples;
    const box = (el: Element | null) => {
      const r = el?.getBoundingClientRect();
      return r ? `${r.left},${r.top},${r.width}` : '-';
    };
    const centre = (r: DOMRect) => r.left + r.width / 2;
    const frame = () => {
      const scroller = document.querySelector('dialog [data-dialog-scroller]');
      const panel = document.querySelector('dialog [data-dialog-backdrop] + *');
      samples.push({
        header: box(document.querySelector('header')),
        offset:
          scroller && panel
            ? Math.abs(
                centre(scroller.getBoundingClientRect()) -
                  centre(panel.getBoundingClientRect()),
              )
            : 0,
        page: box(document.querySelector('[data-testid="route-show"]')),
      });
      if (samples.length < 90) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await tile.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (window as unknown as { samples: unknown[] }).samples.length,
        ),
      { message: 'the frames are sampled' },
    )
    .toBe(90);
  const samples = await page.evaluate(
    () =>
      (
        window as unknown as {
          samples: Array<{ offset: number; header: string; page: string }>;
        }
      ).samples,
  );
  const offsets = samples.map((sample) => Math.round(sample.offset));
  expect(Math.max(...offsets), `off centre per frame: ${offsets}`).toBeLessThan(
    1,
  );
  const headers = [...new Set(samples.map((sample) => sample.header))];
  expect(headers, 'the header’s box (left,top,width)').toHaveLength(1);
  const pages = [...new Set(samples.map((sample) => sample.page))];
  expect(pages, 'the page’s box (left,top,width)').toHaveLength(1);
});
