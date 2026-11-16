import { expect, type Page, test } from '@playwright/test';

import { png } from './helpers/png';

/**
 * Home's spotlight on a production build, signed out: the slide opens its
 * show (the logo or title, the artwork; the buttons and the pager keep their
 * own jobs), and a switch is one timeline: the page colour, the artwork's
 * crossfade and the text start together.
 */

/** A tiny PNG for every TMDB image, so backdrops load (and decode) locally */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==',
  'base64',
);

test.beforeEach(async ({ context }) => {
  await context.route('https://image.tmdb.org/**', (route) =>
    route.fulfill({ body: PIXEL, contentType: 'image/png' }),
  );
});

const spotlight = (page: Page) =>
  page.getByRole('region', { name: 'Trending spotlight' });
const slide = (page: Page, n: number) =>
  spotlight(page).getByRole('group', { name: new RegExp(`^${n} of 10: `) });
const pagerLine = (page: Page, n: number) =>
  spotlight(page)
    .getByRole('group', { name: 'Trending series' })
    .getByRole('button', { name: new RegExp(`^${n} of 10: `) });

test('the logo opens the show', async ({ page }) => {
  await page.goto('/');
  const link = slide(page, 1).getByRole('link', { name: 'Pluribus' });
  await expect(link).toHaveAttribute('href', '/225171/pluribus');
  await link.click();
  await expect(page).toHaveURL(/\/225171\/pluribus$/);
});

test('Enter on the focused logo opens the show', async ({ page }) => {
  await page.goto('/');
  const link = slide(page, 1).getByRole('link', { name: 'Pluribus' });
  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/225171\/pluribus$/);
});

test('the artwork opens the show; the buttons and the pager do their own thing', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto('/');
  // Watchlist signed out asks to sign in, and stays on Home
  await slide(page, 1)
    .getByRole('button', { name: 'Add Pluribus to your watchlist' })
    .click();
  await expect(
    page.getByText('Please sign in to use this feature'),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  // a pager line switches the slide, and stays on Home
  await pagerLine(page, 3).click();
  await expect(slide(page, 3)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  // an empty part of the artwork (right of the text, above the pager)
  await page.mouse.click(1000, 300);
  await expect(page).not.toHaveURL(/\/$/);
});

test('a switch starts the page colour, the artwork and the text together', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto('/');
  // let the next slide's backdrop decode (the countdown preloads it)
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const w = window as unknown as {
      __starts: Record<string, number>;
      __run: boolean;
    };
    const section = document.querySelector(
      'section[aria-roledescription="carousel"]',
    );
    const ground = document.querySelector('[class*="home-ground"]');
    w.__starts = {};
    w.__run = true;
    const known = new Set(document.getAnimations());
    const tick = () => {
      for (const animation of document.getAnimations()) {
        if (known.has(animation) || animation.startTime === null) {
          continue;
        }
        const target = (animation.effect as KeyframeEffect | null)?.target;
        const kind =
          target === ground
            ? 'ground'
            : target instanceof HTMLElement &&
                section?.contains(target) &&
                target.matches('[data-spotlight-layer]')
              ? 'artwork'
              : target instanceof HTMLElement &&
                  target.matches('[aria-roledescription="slide"]') &&
                  target.getAttribute('aria-hidden') !== 'true'
                ? 'text'
                : null;
        if (kind && w.__starts[kind] === undefined) {
          w.__starts[kind] = Number(animation.startTime);
        }
      }
      if (w.__run) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });
  await pagerLine(page, 2).click();
  await expect(slide(page, 2)).toBeVisible();
  await page.waitForTimeout(300);
  const starts = await page.evaluate(() => {
    const w = window as unknown as {
      __starts: Record<string, number>;
      __run: boolean;
    };
    w.__run = false;
    return w.__starts;
  });
  expect(Object.keys(starts).sort()).toEqual(['artwork', 'ground', 'text']);
  const ground = starts.ground ?? 0;
  expect(Math.abs((starts.artwork ?? 0) - ground)).toBeLessThanOrEqual(32);
  expect(Math.abs((starts.text ?? 0) - ground)).toBeLessThanOrEqual(32);
});

/** The pager's current line ("1 of 10: Pluribus") and the page colour */
const shown = (page: Page) =>
  page.evaluate(() => ({
    colour: getComputedStyle(
      document.querySelector('[data-home-ground]') as Element,
    ).backgroundColor,
    slide: document
      .querySelector('[data-slot="spotlight"] [aria-current="true"]')
      ?.getAttribute('aria-label'),
  }));

/** One slide is 8s: wait longer than that */
const LONGER_THAN_A_SLIDE = 9_500;

/**
 * Pluribus's logo is 2.5 : 1 in the fixture (`titleTreatmentAspectRatio`),
 * answered here as a 500 × 200 file (TMDB's w500): its box is held at the
 * size it loads at, so the lines above it (the text stands on the stage's
 * foot) don't move when it arrives.
 */
for (const viewport of [
  { box: { height: 150, width: 375 }, height: 900, width: 1440 },
  { box: { height: 70, width: 175 }, height: 844, width: 390 },
] as const) {
  test(`the logo holds its box until it loads, at ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      'https://image.tmdb.org/**/ds_pluribus_logo.png',
      async (route) => {
        await gate;
        await route.fulfill({ body: png(500, 200), contentType: 'image/png' });
      },
    );
    // not the load event: it waits for the logo
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const logo = slide(page, 1).getByRole('img', { name: 'Pluribus' });
    const rank = slide(page, 1).getByText('#1 trending this week');
    await expect(logo).toBeVisible();
    const held = await logo.boundingBox();
    const rankHeld = await rank.boundingBox();

    release();
    await expect
      .poll(() =>
        logo.evaluate(
          (image: HTMLImageElement) =>
            image.complete &&
            image.naturalWidth === 500 &&
            image.style.getPropertyValue('--logo-ratio') === '',
        ),
      )
      .toBe(true);
    const loaded = await logo.boundingBox();
    const rankLoaded = await rank.boundingBox();

    // the file's natural size inside the cap, as without the ratio
    expect(loaded?.width).toBeCloseTo(viewport.box.width, 0);
    expect(loaded?.height).toBeCloseTo(viewport.box.height, 0);
    // and the box it held before
    expect(held?.width).toBeCloseTo(loaded?.width ?? 0, 0);
    expect(held?.height).toBeCloseTo(loaded?.height ?? 0, 0);
    // the text stands on the stage's foot: the rank line above the logo stays
    expect(rankHeld?.y).toBeCloseTo(rankLoaded?.y ?? 0, 0);
  });
}

test.describe('the spotlight holds when the reader is elsewhere', () => {
  test.setTimeout(60_000);
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await page.goto('/');
    await page.waitForLoadState('load');
    // the mouse away from the spotlight (hover holds it too)
    await page.mouse.move(4, 896);
  });

  test('scrolled away: the slide and the page colour stay; back, it runs', async ({
    page,
  }) => {
    await page.evaluate(() => window.scrollTo(0, 1800));
    const before = await shown(page);
    await page.waitForTimeout(LONGER_THAN_A_SLIDE);
    expect(await shown(page)).toEqual(before);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect
      .poll(async () => (await shown(page)).slide, { timeout: 11_000 })
      .not.toBe(before.slide);
  });

  test('under search: it holds; closed, it runs', async ({ page }) => {
    await page.getByRole('button', { name: 'Search' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const before = await shown(page);
    await page.waitForTimeout(LONGER_THAN_A_SLIDE);
    expect(await shown(page)).toEqual(before);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect
      .poll(async () => (await shown(page)).slide, { timeout: 11_000 })
      .not.toBe(before.slide);
  });
});

test.describe('auto-advance and reduced motion', () => {
  test.setTimeout(60_000);
  const open = async (page: Page) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await page.goto('/');
    await page.waitForLoadState('load');
    // the mouse away from the spotlight (hover holds it too)
    await page.mouse.move(4, 896);
  };
  const toggle = (page: Page, name: 'Pause' | 'Play') =>
    spotlight(page).getByRole('button', { name: `${name} the slideshow` });

  test('it advances by itself, the button offering pause', async ({ page }) => {
    await open(page);
    await expect(toggle(page, 'Pause')).toBeVisible();
    const before = await shown(page);
    await expect
      .poll(async () => (await shown(page)).slide, { timeout: 11_000 })
      .not.toBe(before.slide);
  });

  test.describe('asked for', () => {
    test.use({ reducedMotion: 'reduce' });

    test('it never advances by itself; the same button offers play, and play runs it a slide at a time', async ({
      page,
    }) => {
      await open(page);
      const button = toggle(page, 'Play');
      await expect(button).toBeVisible();
      // the same 32px button in the same place as the pause it replaces
      const box = await button.boundingBox();
      expect(box?.width).toBe(32);
      expect(box?.height).toBe(32);
      const before = await shown(page);
      await page.waitForTimeout(LONGER_THAN_A_SLIDE);
      expect(await shown(page)).toEqual(before);

      // the pager still switches
      await pagerLine(page, 3).click();
      await expect(pagerLine(page, 3)).toHaveAttribute('aria-current', 'true');
      await page.mouse.move(4, 896);

      // pressing play is the reader's choice: it runs, still 8s a slide
      await button.click();
      await expect(toggle(page, 'Pause')).toBeVisible();
      await page.mouse.move(4, 896);
      await page.waitForTimeout(2_000);
      await expect(pagerLine(page, 3)).toHaveAttribute('aria-current', 'true');
      await expect(pagerLine(page, 4)).toHaveAttribute('aria-current', 'true', {
        timeout: 11_000,
      });
    });
  });
});
