import { expect, type Locator, type Page, test } from '@playwright/test';

import { open } from './helpers';
import { untilStable } from './helpers/viewport';

/**
 * One tile hover (TLHover variant A): a poster grows 4%
 * in 250ms, a backdrop tile 3%, nothing else; an episode tile doesn't grow
 * and draws no ring, its still zooms 3%. A row's clip leaves room for the
 * grow.
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
 * Read once the transition (250ms; an episode still's 400ms) has ended.
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

test('a landing poster and Home’s posters grow the same as a hub poster', async ({
  page,
}) => {
  const scales: number[] = [];
  await page.goto('/discover');
  const hub = firstPosterLink(page, /Essentials/);
  await hub.scrollIntoViewIfNeeded();
  await hub.hover();
  scales.push((await settledScale(hub, { grows: true })).scale);
  for (const path of ['/genre/crime', '/']) {
    await page.goto(path);
    const link = page
      .locator('ul[role="list"] li a[href^="/"]')
      .filter({ has: page.locator('img') })
      .first();
    await link.scrollIntoViewIfNeeded();
    await link.hover();
    scales.push((await settledScale(link, { grows: true })).scale);
  }
  expect(scales[0]).toBeGreaterThan(1);
  expect(new Set(scales).size).toBe(1);
});

test('@design a poster grows 4%', async ({ page }) => {
  await page.goto('/discover');
  const link = firstPosterLink(page, /Essentials/);
  await link.scrollIntoViewIfNeeded();
  await link.hover();
  expect(await settledScale(link, { grows: true })).toEqual({
    scale: 1.04,
    y: 0,
  });
});

test('an episode tile does not grow or draw a ring; its still zooms', async ({
  page,
}) => {
  await open(page, '/136315/the-bear');
  const tile = page.locator('[data-episode-tile]').first();
  // the wall settles after hydration: hover retries until the tile is stable
  await tile.hover();
  expect((await settledScale(tile)).scale).toBe(1);
  const shadow = await tile.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).not.toContain('inset');
  const still = tile.locator('img').first();
  expect((await settledScale(still, { grows: true })).scale).toBeGreaterThan(1);
});

test('@design an episode still zooms 3%', async ({ page }) => {
  await open(page, '/136315/the-bear');
  const tile = page.locator('[data-episode-tile]').first();
  await tile.hover();
  const still = tile.locator('img').first();
  expect((await settledScale(still, { grows: true })).scale).toBe(1.03);
});
