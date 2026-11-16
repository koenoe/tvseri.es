import { expect, type Page, test } from '@playwright/test';

/**
 * The spotlight's pause button holds in real time, shared by the Chromium
 * and WebKit specs, on a desktop and on a phone with touch: paused, the
 * countdown and the slide stay put past a slide's 8s, also when the reader
 * scrolls the spotlight away and back; play resumes the line from where it
 * stopped.
 */

/** A slide lasts 8s: waiting longer proves a pause holds */
const PAST_A_SLIDE_MS = 9000;

const toggle = (page: Page, name: 'Pause' | 'Play') =>
  page
    .getByRole('region', { name: 'Trending spotlight' })
    .getByRole('button', { name: `${name} the slideshow` });

/** The current pager line and its countdown's progress (ms) */
const countdown = (page: Page) =>
  page.evaluate(() => {
    const [animation] = document
      .getAnimations()
      .filter(
        (item) =>
          item instanceof CSSAnimation &&
          item.animationName.includes('spotlight-countdown'),
      );
    return {
      line: document
        .querySelector('[data-slot="spotlight"] [aria-current="true"]')
        ?.getAttribute('aria-label'),
      time: Math.round(Number(animation?.currentTime ?? Number.NaN)),
    };
  });

const scrollAwayAndBack = async (page: Page) => {
  await page.evaluate(() => window.scrollTo(0, 1800));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1800);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.waitForTimeout(500);
};

export function spotlightPauseSuite() {
  test.describe('the spotlight’s pause button', () => {
    test.setTimeout(60_000);

    test('desktop: paused, it stays put past a slide and through a scroll; play resumes it', async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await page.goto('/');
      await page.waitForLoadState('load');
      await toggle(page, 'Pause').click();
      // the mouse away from the spotlight (hover holds it too)
      await page.mouse.move(4, 896);
      const paused = await countdown(page);
      expect(paused.time).toBeGreaterThanOrEqual(0);

      await page.waitForTimeout(PAST_A_SLIDE_MS);
      expect(await countdown(page)).toEqual(paused);

      await scrollAwayAndBack(page);
      expect(await countdown(page)).toEqual(paused);

      await toggle(page, 'Play').click();
      await page.mouse.move(4, 896);
      await page.waitForTimeout(1000);
      const resumed = await countdown(page);
      expect(resumed.line).toBe(paused.line);
      expect(resumed.time).toBeGreaterThan(paused.time + 500);
    });

    test.describe('a phone', () => {
      test.use({ hasTouch: true, viewport: { height: 844, width: 390 } });

      test('a tap on pause holds it past a slide and through a scroll; play resumes it', async ({
        page,
      }) => {
        await page.goto('/');
        await page.waitForLoadState('load');
        await toggle(page, 'Pause').tap();
        const paused = await countdown(page);
        expect(paused.time).toBeGreaterThanOrEqual(0);

        await page.waitForTimeout(PAST_A_SLIDE_MS);
        expect(await countdown(page)).toEqual(paused);

        await scrollAwayAndBack(page);
        expect(await countdown(page)).toEqual(paused);

        // Playwright's WebKit keeps a mouse where the tap was and fires a
        // mouse `pointerenter` on the spotlight when the page scrolls under
        // it (a hover hold no phone has): the mouse leaves first
        await page.mouse.move(4, 840);
        await toggle(page, 'Play').tap();
        await page.waitForTimeout(1000);
        const resumed = await countdown(page);
        expect(resumed.line).toBe(paused.line);
        expect(resumed.time).toBeGreaterThan(paused.time + 500);
      });
    });
  });
}
