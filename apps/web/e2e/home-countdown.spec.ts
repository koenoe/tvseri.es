import { expect, type Locator, type Page, test } from '@playwright/test';

import { routeImages } from './helpers/pickRoll';

/**
 * The Countdown (HMFinal `e3-cdj`, the owner's design) on `/dev/home`'s
 * fixture (`#feature-countdown`: The White Lotus in 3 days, Barry without a
 * logo in 5, a long title in 18): the label inside the card, three pills,
 * and a crossfade between the premieres that never lands on an empty layer.
 */

test.use({ viewport: { height: 900, width: 1440 } });

test.beforeEach(async ({ context }) => {
  await routeImages(context);
});

const card = (page: Page) => page.locator('#feature-countdown');
const pills = (page: Page) =>
  card(page).getByRole('group', { name: 'Next premieres' }).getByRole('button');
const backdrop = (page: Page, n: number) =>
  card(page).locator(`[data-countdown-backdrop="${n}"]`);
const body = (page: Page, n: number) =>
  card(page).locator(`[data-countdown-body="${n}"]`);

/** A warmed backdrop has loaded and decoded (the switch waits for that) */
const decoded = (page: Page, n: number) =>
  expect
    .poll(() =>
      backdrop(page, n)
        .locator('img')
        .evaluate((img: HTMLImageElement) =>
          img.complete ? img.decode().then(() => true) : false,
        ),
    )
    .toBe(true);

const opacity = (layer: Locator) =>
  layer.evaluate((element) => Number(getComputedStyle(element).opacity));

/** Settled: the shown foreground opaque, the others gone and inert */
async function settledOn(page: Page, shown: number) {
  for (const n of [0, 1, 2]) {
    await expect.poll(() => opacity(body(page, n))).toBe(n === shown ? 1 : 0);
  }
  await expect(body(page, shown)).not.toHaveAttribute('inert');
}

async function open(page: Page) {
  await page.goto('/dev/home');
  await card(page).scrollIntoViewIfNeeded();
  await expect(pills(page)).toHaveCount(3);
}

test('the label names the card; three pills, the first pressed', async ({
  page,
}) => {
  await open(page);
  await expect(
    card(page).getByRole('heading', { level: 2, name: 'Next big premiere' }),
  ).toBeVisible();
  await expect(
    card(page).getByRole('region', { name: 'Next big premiere' }),
  ).toBeVisible();
  await expect(pills(page).nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(pills(page).nth(1)).toHaveAttribute('aria-pressed', 'false');
  // only the first backdrop is there until the pills are approached
  await expect(backdrop(page, 0)).toBeAttached();
  await expect(backdrop(page, 1)).toHaveCount(0);
  await settledOn(page, 0);
});

test('a pill crossfades: both layers stacked, opacity in transition', async ({
  page,
}) => {
  await open(page);
  await pills(page).nth(1).hover();
  await expect(backdrop(page, 1)).toBeAttached();
  // the incoming image is decoded before the switch
  await decoded(page, 1);
  await page.waitForTimeout(50);

  // mid-fade, read in the page two frames after the press (a round trip
  // from the test could land after the 300ms fade): both backdrops and both
  // foregrounds there, fading on opacity
  const during = await card(page).evaluate(
    (root) =>
      new Promise<
        ReadonlyArray<{
          duration?: string;
          fading: boolean;
          property?: string;
        }>
      >((resolve) => {
        root
          .querySelectorAll<HTMLButtonElement>(
            '[aria-label="Next premieres"] button',
          )[1]
          ?.click();
        const read = () =>
          ['backdrop', 'body'].flatMap((part) =>
            [0, 1].map((n) => {
              const layer = root.querySelector<HTMLElement>(
                `[data-countdown-${part}="${n}"]`,
              );
              const style = layer ? getComputedStyle(layer) : null;
              return {
                duration: style?.transitionDuration,
                fading:
                  layer
                    ?.getAnimations()
                    .some((a) => a.playState === 'running') ?? false,
                property: style?.transitionProperty,
              };
            }),
          );
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(read())),
        );
      }),
  );
  await expect(pills(page).nth(1)).toHaveAttribute('aria-pressed', 'true');
  for (const layer of during) {
    expect(layer.property).toContain('opacity');
    expect(layer.duration).toContain('0.3s');
  }
  // the incoming backdrop and both foregrounds are in their fade now
  expect(during[1]?.fading).toBe(true);
  expect(during[2]?.fading || during[3]?.fading).toBe(true);

  await settledOn(page, 1);
  await expect(body(page, 1)).toContainText('Barry');
  await expect(body(page, 1)).toContainText('Special');
});

test('a backdrop that is not ready holds the old one until it is', async ({
  context,
  page,
}) => {
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  // registered last, so it answers first: the third backdrop waits
  await context.route('https://image.tmdb.org/**', async (route) => {
    if (route.request().url().includes('st_bd_traitors')) {
      await held;
    }
    await route.fallback();
  });
  await open(page);
  await pills(page).nth(2).click();
  await expect(pills(page).nth(2)).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(500);
  // still The White Lotus: no fade to an empty layer
  expect(await opacity(body(page, 0))).toBe(1);
  expect(await opacity(body(page, 2))).toBe(0);
  release();
  await settledOn(page, 2);
});

test('quick switching settles on the last choice', async ({ page }) => {
  await open(page);
  await pills(page).nth(0).hover();
  await decoded(page, 1);
  await decoded(page, 2);
  await page.waitForTimeout(50);
  await pills(page).nth(1).click();
  await pills(page).nth(2).click();
  await pills(page).nth(0).click();
  await settledOn(page, 0);
  await expect.poll(() => opacity(backdrop(page, 0))).toBe(1);
  await expect.poll(() => opacity(backdrop(page, 1))).toBe(0);
  await expect.poll(() => opacity(backdrop(page, 2))).toBe(0);
});

test('the pills work from the keyboard', async ({ page }) => {
  await open(page);
  await pills(page).nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(pills(page).nth(1)).toHaveAttribute('aria-pressed', 'true');
  await settledOn(page, 1);
  await page.keyboard.press('Tab');
  await expect(pills(page).nth(2)).toBeFocused();
  await page.keyboard.press('Space');
  await settledOn(page, 2);
});
