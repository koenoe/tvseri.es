import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';

/**
 * The site footer: full width, its links, and that no error view has it
 * under it.
 */

const footer = (page: Page) => page.locator('[data-site-footer]');

const footerHeight = async (page: Page) =>
  Math.round((await footer(page).boundingBox())?.height ?? 0);

/** The footer's band and everything in it, within the room the page has */
const footerFits = (page: Page) =>
  footer(page).evaluate((element) => {
    const room = document.documentElement.clientWidth;
    const band = element.getBoundingClientRect();
    const outside = [...element.querySelectorAll('a, p, svg, img')]
      .map((child) => child.getBoundingClientRect())
      .filter(
        (box) =>
          box.width > 0 &&
          (box.left < band.left - 0.5 || box.right > band.right + 0.5),
      ).length;
    return {
      full: Math.abs(band.left) <= 0.5 && Math.abs(band.width - room) <= 0.5,
      outside,
    };
  });

test.describe('the footer', () => {
  for (const width of [1440, 390]) {
    test(`is full width, holds its content and is the same on Home and a show page at ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width });
      const heights: number[] = [];
      for (const path of ['/', '/136315/the-bear']) {
        await open(page, path);
        await expect(footer(page)).toBeVisible();
        expect(await footerFits(page), path).toEqual({
          full: true,
          outside: 0,
        });
        heights.push(await footerHeight(page));
      }
      expect(heights[1]).toBe(heights[0]);
    });
  }

  // At 390 "OMDb" ended a line and "(CC BY-NC 4.0)" began the next
  for (const width of [390]) {
    test(`keeps "OMDb (CC BY-NC 4.0)" on one line at ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width });
      await page.goto('/');
      const info = page.getByRole('contentinfo');
      const omdb = await info.getByRole('link', { name: 'OMDb' }).boundingBox();
      const licence = await info
        .getByRole('link', { name: 'CC BY-NC 4.0' })
        .boundingBox();
      expect(Math.round(licence?.y ?? -1)).toBe(Math.round(omdb?.y ?? 0));
    });
  }

  test('is in the static shell, with its credits and links', async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto('/discover');
        const info = page.getByRole('contentinfo');
        await expect(info).toContainText(
          'This site uses data from , ratings from OMDb (CC BY-NC 4.0) and streaming availability from but is neither certified nor endorsed by them.',
        );
        await expect(info.getByRole('link', { name: 'TMDB' })).toHaveAttribute(
          'href',
          'https://www.themoviedb.org',
        );
        await expect(
          info.getByRole('link', { name: 'JustWatch' }),
        ).toHaveAttribute('href', 'https://www.justwatch.com');
        await expect(
          info.getByRole('link', { name: /^GitHub/ }),
        ).toHaveAttribute('target', '_blank');
        await expect(
          info.getByRole('link', { name: 'Privacy' }),
        ).toHaveAttribute('href', '/privacy');
        await expect(info.getByRole('link', { name: 'OMDb' })).toHaveAttribute(
          'href',
          'https://www.omdbapi.com',
        );
        await expect(info.getByRole('link')).toHaveCount(7);
      },
      { baseURL },
    );
  });

  test('Privacy opens the privacy page', async ({ page }) => {
    await open(page, '/');
    await footer(page).getByRole('link', { name: 'Privacy' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Privacy' }),
    ).toBeVisible();
  });

  test('Top goes back to the top of the page', async ({ page }) => {
    await open(page, '/136315/the-bear');
    await footer(page).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await footer(page).getByRole('link', { name: 'Top' }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});

/** An error view is up and no footer shows, from its first frame. */
const expectErrorWithoutFooter = async (page: Page, title: string | RegExp) => {
  await expect(
    page.getByRole('heading', { level: 1, name: title }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  await expect(footer(page)).toBeHidden();
  // one site header: a view inside the site layout draws none of its own
  await expect(page.locator('header[data-header-mode]')).toHaveCount(1);
};

const LOST = /This page|channel 404|truth is out there/;

for (const width of [1440]) {
  test.describe(`no footer under an error view at ${width}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ height: 900, width });
    });

    for (const path of ['/abc']) {
      test(`404, hard load (${path})`, async ({ page, baseURL }) => {
        await instant(
          page,
          async () => {
            await page.goto(path);
            await expect(page.getByText('Page not found')).toBeVisible();
            await expect(footer(page)).toBeHidden();
          },
          { baseURL },
        );
        await expectErrorWithoutFooter(page, LOST);
      });
    }

    for (const path of ['/999998/nothing']) {
      test(`404 from inside a page (${path})`, async ({ page }) => {
        await page.goto(path);
        await expectErrorWithoutFooter(page, LOST);
      });
    }

    test('404 after a soft navigation', async ({ page }) => {
      await open(page, '/');
      await expect(footer(page)).toBeVisible();
      await page.evaluate(() =>
        (
          window as unknown as {
            next: { router: { push: (href: string) => void } };
          }
        ).next.router.push('/999998/nothing'),
      );
      await expectErrorWithoutFooter(page, LOST);
    });

    test('401 (signed out on Settings)', async ({ page }) => {
      await page.goto('/settings');
      await expectErrorWithoutFooter(page, 'Sign in, so we know your name.');
    });

    test('data down', async ({ page }) => {
      await page.goto('/900090/down');
      await expectErrorWithoutFooter(page, 'Our series data is on a break.');
    });

    test('500, then off air', async ({ context, page }) => {
      // the stub's `crash` show answers a body the page can't render
      await page.goto('/900093/crash');
      await expectErrorWithoutFooter(
        page,
        '“Have you tried turning it off and on again?”',
      );
      await context.setOffline(true);
      await expectErrorWithoutFooter(page, 'You’re off air.');
      await context.setOffline(false);
    });
  });
}
