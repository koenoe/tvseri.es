import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * A slice's picture never stretches while the slice opens: the slice grows
 * around a picture that keeps the open slice's size, so on every frame of
 * the opening the picture's drawn width to height stays the same. Measured
 * on the owner's Favourites, on a desktop (hover) and a phone (tap).
 */

async function openFavourites(page: Page) {
  await page.goto('/u/alex');
  await page.waitForFunction(
    () => !document.querySelector('header [data-viewer-pending]'),
  );
  const favourites = page.locator('[data-slot="favourites"]');
  await favourites.scrollIntoViewIfNeeded();
  const slices = favourites.locator('[data-open]');
  await expect(slices.first()).toHaveAttribute('data-open', 'true');
  await expect(slices.nth(1).locator('img').first()).toBeVisible();
  return slices;
}

/** The second slice's picture, drawn width over height, on each frame */
function sampleWhileOpening(page: Page) {
  return page.evaluate(async () => {
    const slice = document.querySelectorAll(
      '[data-slot="favourites"] [data-open]',
    )[1];
    const img = slice?.querySelector('img');
    if (!slice || !img) {
      throw new Error('no second slice with a picture');
    }
    const ratios: number[] = [];
    for (let frame = 0; frame < 45; frame += 1) {
      await new Promise((done) => requestAnimationFrame(done));
      const box = img.getBoundingClientRect();
      ratios.push(box.width / box.height);
    }
    return ratios;
  });
}

for (const viewport of [
  { height: 900, touch: false, width: 1440 },
  { height: 844, touch: true, width: 390 },
]) {
  test.describe(`a slice opening at ${viewport.width}px`, () => {
    test.use({
      hasTouch: viewport.touch,
      viewport: { height: viewport.height, width: viewport.width },
    });

    test('its picture keeps its shape on every frame', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      const slices = await openFavourites(page);
      const second = slices.nth(1);
      const sampling = sampleWhileOpening(page);
      if (viewport.touch) {
        await second.tap({ position: { x: 40, y: 28 } });
      } else {
        await second.hover();
      }
      const ratios = await sampling;
      await expect(second).toHaveAttribute('data-open', 'true');
      const first = ratios[0] ?? 0;
      for (const ratio of ratios) {
        expect(Math.abs(ratio - first) / first).toBeLessThan(0.01);
      }
    });
  });
}
