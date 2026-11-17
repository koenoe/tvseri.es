import { instant } from '@next/playwright';
import {
  expect,
  type Locator,
  type Page,
  type Route,
  test,
} from '@playwright/test';

import { open } from './helpers';
import { signInAs } from './helpers/session';
import { phoneScrollbars, untilStable } from './helpers/viewport';

/**
 * The person page against the stub API
 * (fixtures/person.ts). `instant()` gates dynamic data: what is asserted
 * inside it is in the static shell; the viewer's watched line is the one
 * request-time hole and must not be.
 */

const CRANSTON = '/person/17419/bryan-cranston';

/** A row's height once it has stopped changing (fonts and the page settle) */
async function settledHeight(row: Locator) {
  let height = 0;
  await untilStable(
    async () => {
      height = (await row.boundingBox())?.height ?? 0;
      return height;
    },
    { message: 'the heading row stops changing height' },
  );
  return height;
}

const name = (page: Page, text: string) =>
  page.getByRole('heading', { level: 1, name: text });

test.describe('person (/person/{id}/{slug})', () => {
  test('is instant on an initial page load: the hero and sections are in the shell', async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto(CRANSTON);
        await expect(name(page, 'Bryan Cranston')).toBeVisible();
        await expect(page.getByText('Born Mar 7, 1956 (age 70)')).toBeVisible();
        await expect(
          page.getByRole('heading', { level: 2, name: 'Known for' }),
        ).toBeVisible();
        await expect(
          page.getByRole('heading', { level: 2, name: 'Career' }),
        ).toBeVisible();
        await expect(
          page.getByRole('heading', { level: 2, name: 'Series' }),
        ).toBeVisible();
      },
      { baseURL },
    );
  });

  test('streams the watched line for a signed-in viewer, never in the shell', async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(context, 'alex');
    const line = page.getByLabel('Watched, signed in');
    await instant(
      page,
      async () => {
        await page.goto(CRANSTON);
        await expect(name(page, 'Bryan Cranston')).toBeVisible();
        await expect(line).toHaveCount(0);
      },
      { baseURL },
    );
    await expect(line).toContainText('Watched 74 episodes, 3 of 67 series');
    await expect(
      page.getByRole('link', {
        name: /^Breaking Bad\s?: Walter White, 62 episodes, 2008–2013\s?, 62 of 62 watched$/,
      }),
    ).toBeVisible();
  });

  test('is instant on a client navigation from search: the route shell commits at once', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-search-ready', '');
    await page.keyboard.press('Control+k');
    await page
      .getByRole('combobox', { name: 'Search series and people' })
      .fill('bryan');
    const result = page
      .getByRole('dialog', { name: 'Search' })
      .getByRole('option', { name: /Bryan Cranston/ });
    await expect(result).toBeVisible();
    await instant(page, async () => {
      await result.click();
      await page.waitForURL(CRANSTON);
      await expect(page.getByLabel('Loading')).toBeVisible();
    });
    await expect(name(page, 'Bryan Cranston')).toBeVisible();
  });

  test('draws a person who died with the dates and the marker, no Today', async ({
    page,
  }) => {
    await page.goto('/person/129101/lance-reddick');
    await expect(page.getByText('1962 – 2023', { exact: true })).toBeVisible();
    await expect(page.getByText('Died Mar 17, 2023, aged 60')).toBeVisible();
    await expect(
      page.getByText('Died Mar 17, 2023', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Today', { exact: true })).toHaveCount(0);
  });

  test('a sparse person leaves out what is not known', async ({ page }) => {
    await page.goto('/person/4242001/wren-calloway');
    await expect(name(page, 'Wren Calloway')).toBeVisible();
    for (const section of ['Known for', 'Frequent collaborators', 'Awards']) {
      await expect(
        page.getByRole('heading', { level: 2, name: section }),
      ).toHaveCount(0);
    }
  });

  test('a spouse links to their person page only when they have one', async ({
    page,
  }) => {
    await page.goto('/person/4242003/mara-linden');
    const family = page.getByRole('group', { name: 'Family and awards' });
    await expect(family).toContainText('Married to Wren Calloway since 2011');
    await family.getByRole('link', { name: 'Wren Calloway' }).click();
    await expect(page).toHaveURL(/\/person\/4242001\/wren-calloway$/);
    await expect(name(page, 'Wren Calloway')).toBeVisible();

    await page.goto(CRANSTON);
    await expect(
      page.getByRole('group', { name: 'Family and awards' }),
    ).toContainText('Married to Robin Dearden since 1989');
    await expect(page.getByRole('link', { name: 'Robin Dearden' })).toHaveCount(
      0,
    );
  });

  test('the Guest roles row opens Shows on Guest roles', async ({ page }) => {
    await page.goto(CRANSTON);
    await page.getByRole('button', { name: /37 guest roles/ }).click();
    await expect(
      page.getByRole('button', { name: /Guest roles/, pressed: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Show fewer' }),
    ).toBeVisible();
  });

  test('a non-numeric id is the static 404, no function run', async ({
    page,
  }) => {
    const response = await page.goto('/person/abc');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('Page not found')).toBeVisible();
  });

  test('leading zeros 308 to the canonical id at the edge', async ({
    request,
  }) => {
    const response = await request.get('/person/017419/bryan-cranston', {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe('/person/17419/bryan-cranston');
  });

  test('a stale slug ends on the canonical URL', async ({ page }) => {
    await page.goto('/person/17419/old-name');
    await expect(page).toHaveURL(CRANSTON);
    await expect(name(page, 'Bryan Cranston')).toBeVisible();
  });

  // Inside the page's Suspense on a first visit: the not-found page, served
  // with the shell's 200
  for (const [label, path] of [
    ['an unknown id', '/person/9999999'],
    ['an adult-flagged person', '/person/4242002/adult-example'],
  ] as const) {
    test(`${label} draws the not-found page`, async ({ page }) => {
      await page.goto(path);
      // the page's own view, in the main landmark: the router can keep a
      // second, hidden copy of a not-found view beside it for a moment
      await expect(
        page.getByRole('main').getByText('Page not found'),
      ).toBeVisible();
      await expect(page.getByTestId('route-person')).toHaveCount(0);
    });
  }

  const headingRows = async (page: Page) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await phoneScrollbars(page, 390);
    await page.goto(CRANSTON);
    const heights: number[] = [];
    for (const title of ['Known for', 'Career', 'Series']) {
      const row = page
        .getByRole('heading', { level: 2, name: title })
        .locator('..');
      await expect(row).toBeVisible();
      heights.push(await settledHeight(row));
    }
    return heights;
  };

  test('on a phone every section heading row is as tall as the others', async ({
    page,
  }) => {
    const heights = await headingRows(page);
    expect(new Set(heights).size, heights.join(', ')).toBe(1);
  });

  test('@design on a phone every section heading is 28px, like the profile and Stats', async ({
    page,
  }) => {
    expect(await headingRows(page)).toEqual([28, 28, 28]);
  });

  test('signed out, no space is reserved for the viewer', async ({ page }) => {
    await page.goto(CRANSTON);
    await expect(name(page, 'Bryan Cranston')).toBeVisible();
    await expect(page.locator('.viewer-reveal:visible')).toHaveCount(0);
    await expect(page.getByText('Not watched')).toHaveCount(0);
  });

  test('a display cookie without a session is cleared: no space reserved, the signed-out key', async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        domain: 'localhost',
        name: '__tvseries_user',
        path: '/',
        sameSite: 'Lax',
        value: 'alex',
      },
    ]);
    await page.goto(CRANSTON);
    await expect(name(page, 'Bryan Cranston')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Series' }),
    ).toBeVisible();
    await expect(page.getByLabel('Watched, signed in')).toHaveCount(0);
    await expect(page.locator('.viewer-reveal:visible')).toHaveCount(0);
    await expect(page.getByText('Not watched')).toHaveCount(0);
  });
});

test('a list that fails to load says so inside the awards sheet and leaves the Awards card alone', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await open(page, CRANSTON);
  const awardsHead = page.getByRole('heading', {
    exact: true,
    level: 2,
    name: 'Awards',
  });
  await expect(awardsHead).toBeVisible();
  // the list is a server action (a POST to the page): offline, a deploy skew
  const failing = (route: Route) =>
    route.request().method() === 'POST' ? route.abort() : route.fallback();
  await page.route('**/person/**', failing);
  await page.getByRole('button', { name: /^All \d+ nominations$/ }).click();
  const awards = page.getByRole('dialog');
  await expect(awards.getByText('The awards didn’t load.')).toBeVisible();
  // the loaded card is still there, no section failure behind the sheet
  await expect(awardsHead).toBeVisible();
  await expect(
    page.getByText('Awards didn’t load.', { exact: true }),
  ).toHaveCount(0);
  await page.unroute('**/person/**', failing);
  await awards.getByRole('button', { name: 'Try again' }).click();
  await expect(awards.getByRole('heading', { name: 'Won' })).toBeVisible();
  await expect(
    awards.getByText(/^\d+ wins?(, \d+ nominations?)?$/),
  ).toBeVisible();
});

test('the awards sheet is a side panel like the menu: the scrim, Back closes it and stays on the page', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto('/privacy');
  await open(page, CRANSTON);
  await page.getByRole('button', { name: /^All \d+ nominations$/ }).click();
  const awards = page.getByRole('dialog');
  await expect(awards).toBeVisible();
  await expect(page.locator('dialog[open] > [data-dialog-backdrop]')).toHaveCSS(
    'background-color',
    /^(rgba\(0, 0, 0, 0\.5\)|oklab\(0 0 0 \/ 0\.5\))$/,
  );
  await page.goBack();
  await expect(awards).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${CRANSTON}$`));
  // ✕ closes it without leaving an entry behind
  await page.getByRole('button', { name: /^All \d+ nominations$/ }).click();
  await expect(awards).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(awards).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(/\/privacy$/);
});
