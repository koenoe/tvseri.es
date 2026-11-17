import { expect, type Page, test } from '@playwright/test';

import { open } from '../helpers';
import { signInAs } from './session';
import { untilStable } from './viewport';

/**
 * History opens at the top from its tab like every other tab, a revisit
 * included (the router kept the diary from the first visit and shows it
 * again with a new first page: only a Jump to scrolls to the diary's top),
 * and Back and Forward land where you left it. Run by
 * `navigation-scroll.spec.ts` (Chromium) and
 * `navigation-scroll.webkit.spec.ts` (WebKit, a phone only), at a phone's and a
 * desktop's width.
 */

const USER = 'marathonwatcher-2026';
const PATH = `/u/${USER}/history`;

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

/** Presses a profile tab and expects its page at the top, and still there a second later */
async function tabToTop(page: Page, name: string, path: RegExp) {
  await page
    .getByRole('navigation', { name: 'Profile' })
    .getByRole('link', { exact: true, name })
    .click();
  await page.waitForURL(path);
  if (name === 'History') {
    await expect(page.locator('[data-slot="history-diary"]')).toBeVisible();
  }
  await expect.poll(() => scrollY(page)).toBe(0);
  // no late commit scrolls it again (the diary's own landing scroll)
  await page.waitForTimeout(1000);
  expect(await scrollY(page)).toBe(0);
}

export function historyScrollSuite(width: number, height: number) {
  test.describe(`History’s scroll at ${width}px`, () => {
    test.use({ viewport: { height, width } });

    test.beforeEach(async ({ context }) => {
      await signInAs(context, USER);
    });

    test('its tab opens it at the top, on a revisit too', async ({ page }) => {
      await open(page, `/u/${USER}`);
      await tabToTop(page, 'History', /\/history$/);
      await tabToTop(page, 'Library', /\/library$/);
      await tabToTop(page, 'History', /\/history$/);
      await tabToTop(page, 'Overview', new RegExp(`/u/${USER}$`));
      await tabToTop(page, 'History', /\/history$/);
    });

    test('Back and Forward return to the place in the diary, its pages kept', async ({
      page,
    }) => {
      await open(page, `/u/${USER}`);
      await tabToTop(page, 'History', /\/history$/);
      // down past the first page, so a second one has loaded
      const rows = page.locator('[data-diary-row]');
      const first = await rows.count();
      await page.evaluate(() => window.scrollTo(0, 6000));
      await expect.poll(() => rows.count()).toBeGreaterThan(first);
      const loaded = await rows.count();
      // an episode on screen (its show’s page): the place Back returns to
      const show = page
        .locator('[data-diary-row] a[href]')
        .filter({ visible: true });
      const target = await show.evaluateAll((links) => {
        const link = links.find((element) => {
          const box = element.getBoundingClientRect();
          return box.top > 120 && box.bottom < window.innerHeight - 40;
        });
        return link?.getAttribute('href') ?? null;
      });
      expect(target).not.toBeNull();
      // the rows above settle at their real heights (skipped ones were estimates)
      await untilStable(
        () =>
          page.evaluate(() => [
            Math.round(window.scrollY),
            document.documentElement.scrollHeight,
          ]),
        { message: 'the diary kept moving', quietMs: 500 },
      );
      const y = await scrollY(page);
      await page
        .locator(`[data-diary-row] a[href="${target}"]`)
        .filter({ visible: true })
        .first()
        .click();
      await page.waitForURL((url) => !url.pathname.startsWith('/u/'));

      for (const step of ['back', 'forward', 'back'] as const) {
        if (step === 'forward') {
          await page.goForward();
          await page.waitForURL((url) => !url.pathname.startsWith('/u/'));
          continue;
        }
        await page.goBack();
        await page.waitForURL((url) => url.pathname === PATH);
        await expect
          .poll(async () => Math.abs((await scrollY(page)) - y))
          .toBeLessThanOrEqual(4);
        // no late scroll, and every page loaded before is still there
        await page.waitForTimeout(1000);
        expect(Math.abs((await scrollY(page)) - y)).toBeLessThanOrEqual(4);
        expect(await rows.count()).toBeGreaterThanOrEqual(loaded);
      }
    });
  });
}
