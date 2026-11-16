import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';
import { SHIFT_OBSERVER } from './helpers/parity';
import { signInAs } from './helpers/session';
import { untilStable } from './helpers/viewport';

/**
 * The header is in the static shell and the same for everyone: the pre-paint
 * script draws the username (or Sign in) before React hydrates, at the place
 * and width the hydrated link takes. So nothing in it moves on a hard load,
 * signed in or out, at a phone's width or a desktop's: the placeholder specs
 * leave the header's shifts out (they belong to another page), this one
 * counts only them.
 */

const headerShifts = (page: Page) =>
  page.evaluate(() => {
    const shifts =
      (
        window as unknown as {
          __shifts?: ReadonlyArray<{
            sources: ReadonlyArray<{ inHeader: boolean; rect: string }>;
            value: number;
          }>;
        }
      ).__shifts ?? [];
    return shifts
      .filter((shift) => shift.sources.some((source) => source.inHeader))
      .map(
        (shift) =>
          `${shift.value.toFixed(4)} ${shift.sources.map((source) => source.rect).join(', ')}`,
      );
  });

/** Shifts are reported after the frame they happen in: read them once quiet */
const settledHeaderShifts = async (page: Page) => {
  await untilStable(() => headerShifts(page), {
    message: 'the header stops reporting shifts',
    quietMs: 300,
  });
  return headerShifts(page);
};

/** The username slot's box before and after hydration */
const slotBox = (page: Page, name: string) =>
  page.getByRole('banner').getByRole('link', { name }).boundingBox();

for (const width of [390, 1440] as const) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { height: 900, width } });

    test('signed out: nothing in the header moves while the page hydrates', async ({
      page,
    }) => {
      await page.addInitScript(SHIFT_OBSERVER);
      await open(page, '/discover');
      await expect(
        page.getByRole('banner').getByRole('link', { name: 'Sign in' }),
      ).toBeVisible();
      expect(await settledHeaderShifts(page)).toEqual([]);
    });

    test('signed in: the username is drawn before hydration where the link ends up', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await page.addInitScript(SHIFT_OBSERVER);
      // the pre-paint stand-in's box, before any script of React's runs
      await page.route('**/_next/static/**/*.js', (route) => route.abort());
      await page.goto('/discover');
      const pending = page.locator(
        'header [data-viewer-pending] [data-signed-in-only]',
      );
      await expect(pending).toBeVisible();
      const before = await pending.boundingBox();
      await page.unroute('**/_next/static/**/*.js');

      await open(page, '/discover');
      const after = await slotBox(page, 'alex');
      expect(after).not.toBeNull();
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        expect(
          Math.abs((after?.[key] ?? 0) - (before?.[key] ?? 0)),
          key,
        ).toBeLessThanOrEqual(1);
      }
      expect(await settledHeaderShifts(page)).toEqual([]);
    });
  });
}
