import { expect, type Locator, type Page, test } from '@playwright/test';

import { untilStable } from './helpers/viewport';

/**
 * A hovered poster grows inside its row: the rail's clip once cut the grown
 * poster off.
 */

test.use({ viewport: { height: 900, width: 1440 } });

/**
 * The scale and vertical shift a hovered element settles at. Tailwind 4
 * writes `scale-*` and `translate-*` to the CSS `scale` and `translate`
 * properties, not `transform`.
 */
const readScale = (target: Locator) =>
  target.evaluate((el) => {
    const style = getComputedStyle(el);
    const scale = style.scale === 'none' ? 1 : Number.parseFloat(style.scale);
    const y =
      style.translate === 'none'
        ? 0
        : Number.parseFloat(style.translate.split(' ')[1] ?? '0');
    return { scale: Number(scale.toFixed(3)), y: Math.round(y) };
  });

/**
 * Read once the transition has ended.
 * `grows`: the target has to start growing first, so the quiet before the
 * hover took hold is not read as the end.
 */
const settledScale = async (target: Locator, { grows = false } = {}) => {
  if (grows) {
    await expect
      .poll(async () => (await readScale(target)).scale)
      .toBeGreaterThan(1);
  }
  await untilStable(() => readScale(target), {
    message: 'the hover transition ends',
  });
  return readScale(target);
};

const firstPosterLink = (page: Page, region: RegExp) =>
  page
    .getByRole('region', { name: region })
    .getByRole('listitem')
    .first()
    .getByRole('link')
    .first();

test('a Discover hub poster grows, no lift, no ring, and its row does not cut it', async ({
  page,
}) => {
  await page.goto('/discover');
  const link = firstPosterLink(page, /Essentials/);
  await link.scrollIntoViewIfNeeded();
  await link.hover();
  const grown = await settledScale(link, { grows: true });
  expect(grown.scale).toBeGreaterThan(1);
  expect(grown.y).toBe(0);
  const ring = await link.evaluate(
    (el) =>
      getComputedStyle(el.querySelector('span') as Element, '::after')
        .boxShadow,
  );
  expect(ring).not.toContain('2px');
  // the grown poster stays inside the rail's clip
  const fits = await link.evaluate((el) => {
    const rail = el.closest('ul') as HTMLElement;
    const a = el.getBoundingClientRect();
    const b = rail.getBoundingClientRect();
    return a.top >= b.top && a.left >= b.left && a.bottom <= b.bottom;
  });
  expect(fits).toBe(true);
});
