import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';
import { fontsSettled, phoneScrollbars } from './helpers/viewport';

/**
 * The Discover hub (`/discover`): its prerendered shell (title, lens tabs,
 * the default lens's tiles, Essentials and every other shared row) commits
 * under `instant()`. The page is fully static: the region line is a client
 * piece (`/api/region`), never in the server's HTML.
 */

const title = (page: Page) =>
  page.getByRole('heading', { level: 1, name: 'Discover' });
const lensTabs = (page: Page) =>
  page.getByRole('tablist', { name: 'Look at TV by' });
const regionLine = (page: Page) => page.getByText(/^Streaming in /);

/** The hero and the first rows, from the API, in the shell */
async function expectShell(page: Page) {
  await expect(title(page)).toBeVisible();
  await expect(lensTabs(page)).toBeVisible();
  // Duration, the default lens: its first tile
  await expect(
    page.getByRole('button', { exact: true, name: 'Complete stories' }),
  ).toBeVisible();
  const essentials = page.getByRole('region', { name: /Essentials/ });
  await expect(essentials.getByRole('listitem').first()).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Go deeper' }).first(),
  ).toBeVisible();
}

test.describe('discover hub (/discover)', () => {
  test('is instant on an initial page load', async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto('/discover');
        await expectShell(page);
      },
      { baseURL },
    );
    // the stub's server has no geo header: the default region
    await expect(regionLine(page)).toHaveText('Streaming in the United States');
  });

  test('serves no region in its HTML (a static page, one for everyone)', async ({
    request,
  }) => {
    const response = await request.get('/discover');
    expect(response.headers()['x-nextjs-postponed']).toBeUndefined();
    // the pre-paint hint's script holds the words, never a line
    expect(await response.text()).not.toMatch(/Streaming in (the )?[A-Z]/);
  });

  test('is instant on a client navigation from the menu', async ({ page }) => {
    await open(page, '/');
    await page.getByRole('button', { name: 'Menu' }).click();
    const discover = page.getByRole('link', { exact: true, name: 'Discover' });
    await expect(discover).toBeVisible();
    await instant(page, async () => {
      await discover.click();
      await page.waitForURL((url) => url.pathname === '/discover');
      await expectShell(page);
    });
  });

  test('switches lenses and opens a tile in place', async ({ page }) => {
    await open(page, '/discover');
    const tabs = lensTabs(page);
    await expect(tabs.getByRole('tab', { name: 'Duration' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await tabs.getByRole('tab', { name: 'Country' }).click();
    await expect(
      page.getByRole('link', { name: 'United Kingdom' }),
    ).toHaveAttribute('href', '/country/gb');
    await expect(
      page.getByRole('button', { name: 'Under 6 hours' }),
    ).toHaveCount(
      1, // only the weekend row's button; the Duration tiles are hidden
    );

    await tabs.getByRole('tab', { name: 'Decade' }).click();
    const tile = page.getByRole('button', { exact: true, name: '2010s' });
    await tile.click();
    await expect(tile).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.getByRole('heading', { name: '2010s' }).getByRole('link'),
    ).toHaveAttribute('href', '/decade/2010s');

    await page.getByRole('button', { name: 'Close 2010s' }).click();
    await expect(tile).toHaveAttribute('aria-expanded', 'false');
    await expect(tile).toBeFocused();
  });

  test('moves between lenses with the arrow keys (APG tabs)', async ({
    page,
  }) => {
    await open(page, '/discover');
    const tabs = lensTabs(page);
    const duration = tabs.getByRole('tab', { name: 'Duration' });
    await duration.focus();
    await page.keyboard.press('ArrowRight');
    const decade = tabs.getByRole('tab', { name: 'Decade' });
    await expect(decade).toBeFocused();
    await expect(decade).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Decade' })).toBeVisible();
    await expect(
      page.getByRole('button', { exact: true, name: '2010s' }),
    ).toBeVisible();

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    const theme = tabs.getByRole('tab', { name: 'Theme' });
    await expect(theme).toBeFocused();
    await expect(page.getByRole('tabpanel', { name: 'Theme' })).toBeVisible();
    // one tab stop: Tab leaves the list for the panel's first tile
    await page.keyboard.press('Tab');
    await expect(
      page
        .getByRole('tabpanel', { name: 'Theme' })
        .getByRole('link', { name: 'Dystopia' }),
    ).toBeFocused();
  });

  test('draws All-time favourites as a numbered top 20, with no filter', async ({
    page,
  }) => {
    await open(page, '/discover');
    const row = page.getByRole('region', { name: 'All-time favourites' });
    const list = row.locator('ol[role="list"]');
    await expect(list.getByRole('listitem')).toHaveCount(20);
    await expect(row.getByRole('link').first()).toHaveAccessibleName(/^1\. /);
    await expect(row.getByRole('link').nth(19)).toHaveAccessibleName(/^20\. /);
    // the numerals are for the eye only
    await expect(row.getByText('20', { exact: true })).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    await expect(page.getByRole('group', { name: 'Genre' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^All Crime/ })).toHaveCount(0);
  });

  // a page lands on a tile's start, which is its numeral's: never half a numeral at the edge
  test('pages All-time favourites to whole items, numeral first', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await open(page, '/discover');
    const row = page.getByRole('region', { name: 'All-time favourites' });
    await row.scrollIntoViewIfNeeded();
    const rail = row.locator('ol');
    await row
      .getByRole('button', { name: 'Next: All-time favourites' })
      .click();
    await expect
      .poll(() =>
        rail.evaluate((list) => {
          const start = parseFloat(getComputedStyle(list).scrollPaddingLeft);
          const lefts = [...list.children].map(
            (item) => (item as HTMLElement).offsetLeft - start,
          );
          return (
            list.scrollLeft > 0 &&
            lefts.some((left) => Math.abs(left - list.scrollLeft) <= 1)
          );
        }),
      )
      .toBe(true);
  });

  // a numeral may run behind its poster only as far as the tuck: 36
  // of a 290 tile for one digit, 40 for two (under a third of the last
  // digit), so no digit can be lost
  for (const width of [1440, 390]) {
    test(`keeps every numeral's digits in view at ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width });
      await phoneScrollbars(page, width);
      await open(page, '/discover');
      const row = page.getByRole('region', { name: 'All-time favourites' });
      await row.scrollIntoViewIfNeeded();
      await fontsSettled(page);
      const hidden = await row.locator('ol').evaluate((list) => {
        const canvas = document.createElement('canvas').getContext('2d')!;
        return [...list.children].map((item) => {
          const numeral = item.querySelector('[aria-hidden="true"]')!;
          const poster = item.querySelector('a')!.getBoundingClientRect();
          const box = numeral.getBoundingClientRect();
          const text = numeral.textContent ?? '';
          const style = getComputedStyle(numeral);
          let inkEnd = box.right;
          if (text.length > 1) {
            // two digits are proportional figures: the canvas measures their ink
            canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
            canvas.letterSpacing = style.letterSpacing;
            const metrics = canvas.measureText(text);
            const scale = box.width / (numeral as HTMLElement).offsetWidth;
            inkEnd =
              box.right -
              (metrics.width - metrics.actualBoundingBoxRight) * scale;
          }
          // the poster is 180 of the row's 290 tile (a two-digit tile is wider)
          const rowTile = (poster.width * 290) / 180;
          const allowed = ((text.length > 1 ? 40 : 36) / 290) * rowTile + 2;
          return { allowed, behind: inkEnd - poster.left, text };
        });
      });
      expect(hidden).toHaveLength(20);
      for (const { allowed, behind, text } of hidden) {
        expect(behind, `numeral ${text}`).toBeLessThanOrEqual(allowed);
      }
    });
  }
});

test.describe('Essentials title (row titles with a logo)', () => {
  for (const width of [1440, 390]) {
    test(`the logo starts at the row's left edge and sits on the text baseline at ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width });
      await phoneScrollbars(page, width);
      await page.goto('/discover');
      const heading = page
        .getByRole('region', { name: /Essentials/ })
        .getByRole('heading', { level: 2 });
      const logo = heading.getByRole('img');
      await logo.scrollIntoViewIfNeeded();
      await expect
        .poll(() => logo.evaluate((img) => (img as HTMLImageElement).complete))
        .toBe(true);
      const m = await heading.evaluate((h) => {
        const img = h.querySelector('img') as HTMLImageElement;
        const text = [...h.querySelectorAll('*'), h]
          .flatMap((el) => [...el.childNodes])
          .find(
            (node) =>
              node.nodeType === Node.TEXT_NODE &&
              node.textContent?.includes('Essentials'),
          ) as Text;
        // a zero-size inline box on the text's baseline
        const probe = document.createElement('span');
        probe.style.cssText =
          'display:inline-block;width:0;height:0;vertical-align:baseline';
        text.after(probe);
        const baseline = probe.getBoundingClientRect().top;
        probe.remove();
        const section = h.closest('section') as HTMLElement;
        const firstPoster = section.querySelector('li') as HTMLElement;
        return {
          baseline,
          bottom: img.getBoundingClientRect().bottom,
          left: img.getBoundingClientRect().left,
          posterLeft: firstPoster.getBoundingClientRect().left,
        };
      });
      // bottom on the baseline
      expect(Math.abs(m.bottom - m.baseline)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.left - m.posterLeft)).toBeLessThanOrEqual(1);
    });

    test(`the logo is 20px tall (17 on a phone) at ${width}`, {
      tag: '@design',
    }, async ({ page }) => {
      await page.setViewportSize({ height: 900, width });
      await phoneScrollbars(page, width);
      await page.goto('/discover');
      const logo = page
        .getByRole('region', { name: /Essentials/ })
        .getByRole('heading', { level: 2 })
        .getByRole('img');
      await logo.scrollIntoViewIfNeeded();
      await expect
        .poll(() => logo.evaluate((img) => (img as HTMLImageElement).complete))
        .toBe(true);
      const box = await logo.boundingBox();
      expect(box?.height ?? 0).toBeCloseTo(width === 390 ? 17 : 20, 0);
    });
  }
});

test('"Essentials" keeps its place while the network logo loads', async ({
  page,
}) => {
  // hold every image a moment, so the logo arrives after the first layout
  await page.route('**/_next/image**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto('/discover', { waitUntil: 'domcontentloaded' });
  const heading = page
    .getByRole('region', { name: /Essentials/ })
    .getByRole('heading', { level: 2 });
  await expect(heading).toBeVisible();
  const textX = () =>
    heading.evaluate((h) => {
      const node = [...h.querySelectorAll('*'), h]
        .flatMap((el) => [...el.childNodes])
        .find(
          (child) =>
            child.nodeType === Node.TEXT_NODE &&
            child.textContent?.includes('Essentials'),
        ) as Text;
      const range = document.createRange();
      range.selectNodeContents(node);
      return Math.round(range.getBoundingClientRect().left);
    });
  const before = await textX();
  const logo = heading.getByRole('img');
  await expect
    .poll(() => logo.evaluate((img) => (img as HTMLImageElement).complete))
    .toBe(true);
  expect(await textX()).toBe(before);
});

test('Essentials posters carry no percentage: the year alone', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto('/discover');
  const essentials = page.getByRole('region', { name: /Essentials/ });
  const first = essentials.getByRole('listitem').first();
  await expect(first).toBeVisible();
  await expect(first).toContainText(/\d{4}/);
  await expect(essentials).not.toContainText('%');
});
