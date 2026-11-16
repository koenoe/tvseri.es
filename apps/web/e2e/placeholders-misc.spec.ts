import { expect, test } from '@playwright/test';
import { parityTable } from './helpers/parity';
import { measureParity } from './helpers/shellParity';

// Shell mechanism: `instant()` (`helpers/shellParity.ts`); the 404 is static, so `instant()` shows the shell a browser paints.

/**
 * The 404 is entirely static: its content is in the shell, so nothing
 * arrives later and the page does not grow (the audit measured a dev server).
 */
for (const viewport of [
  { height: 900, name: 'desktop', width: 1440 },
  { height: 844, name: 'phone', width: 390 },
] as const) {
  test(`404 ${viewport.name}: the content is in the shell and the page keeps its height`, async ({
    baseURL,
    page,
  }) => {
    await page.setViewportSize(viewport);
    const parity = await measureParity(page, {
      baseURL,
      goto: () => page.goto('/shows/breaking-bad'),
      ready: () => expect(page.getByText('Page not found')).toBeVisible(),
      // with the trending posters: the page is cached for a day. Without them
      // (that read failed) it regenerates every 30 s, and each regeneration
      // picks its still again, so the shell and the content could be two stills
      shellText: 'Or start something new',
      shot: `404-${viewport.name}`,
    });
    console.log(parityTable(parity, `404 ${viewport.name}`));
    expect(
      Math.abs(parity.documentHeight.after - parity.documentHeight.before),
    ).toBeLessThanOrEqual(2);
    expect(parity.cls).toBeLessThan(0.01);
  });
}

/**
 * The 404 picks one of three stills (and so one of three headlines) per
 * cache period. Until Inter loads, the fallback face draws the headline
 * wider, so it must wrap into the same number of lines in both faces for
 * every headline, or the block moves when the font arrives (the
 * layout-shift test above fails on whichever still was picked). Keep the
 * list equal to `NOT_FOUND_STILLS` in `components/ui/error/stills.ts`.
 */
const HEADLINES = [
  'This page is lost.',
  'The truth is out there. This page isn’t.',
  'This page went missing. We asked the lights.',
] as const;

for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
  test(`404 at ${width}: every headline wraps the same in Inter and in its fallback`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width });
    await page.goto('/shows/breaking-bad');
    await expect(page.getByText('Page not found')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const heights = await page.evaluate((headlines) => {
      const h1 = document.querySelector('h1');
      if (!h1) {
        throw new Error('no h1');
      }
      return headlines.map((headline) => {
        h1.textContent = headline;
        h1.style.fontFamily = '';
        const real = h1.getBoundingClientRect().height;
        h1.style.fontFamily = '"Inter Fallback"';
        return { fallback: h1.getBoundingClientRect().height, headline, real };
      });
    }, HEADLINES);
    for (const { fallback, headline, real } of heights) {
      expect(fallback, `${headline} (${width}px)`).toBe(real);
    }
  });
}
