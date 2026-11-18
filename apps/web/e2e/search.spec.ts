import { expect, type Page, test } from '@playwright/test';

import {
  dialog,
  enterAhead,
  field,
  marked,
  open,
  option,
} from './helpers/search';
import { signInAs } from './helpers/session';

/**
 * Search against the stub API (fixtures/search.ts). Playwright's Desktop
 * Chrome reports Windows, so the shortcut is Ctrl.
 */

async function openSearch(page: Page) {
  await page.keyboard.press('Control+k');
  await expect(field(page)).toBeFocused();
}

const searchRequests = (page: Page) => {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/search')) {
      urls.push(request.url());
    }
  });
  return urls;
};

test('Ctrl+K and Ctrl+F open and close search', async ({ page }) => {
  await open(page);

  await page.keyboard.press('Control+k');
  await expect(dialog(page)).toBeVisible();
  await expect(field(page)).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(dialog(page)).toBeHidden();

  await page.keyboard.press('Control+f');
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Control+f');
  await expect(dialog(page)).toBeHidden();
});

test('the header button and the floating pill open it', async ({ page }) => {
  await open(page);
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Search' })
    .click();
  await expect(field(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();

  // the pill: scroll down past 60 px, then up
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '4000px';
    document.body.append(spacer);
  });
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, 800);
  await page.mouse.wheel(0, -200);
  const header = page.locator('header[data-header-mode]');
  await expect(header).toHaveAttribute('data-header-mode', 'floating');
  await header.getByRole('button', { name: 'Search' }).click();
  await expect(field(page)).toBeFocused();
});

test('Escape closes and gives focus back to the button', async ({ page }) => {
  await open(page);
  const button = page
    .getByRole('banner')
    .getByRole('button', { name: 'Search' });
  await button.click();
  await field(page).fill('the bear');
  await expect(option(page, /The Bear/).first()).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(dialog(page)).toBeHidden();
  await expect(button).toBeFocused();
});

test('Enter opens the marked first result (the ranking’s best match)', async ({
  page,
}) => {
  await open(page);
  await openSearch(page);
  await field(page).fill('bre');

  // TMDB lists Breaking Bad fifth for “bre”; the ranking puts it first
  await expect(marked(page)).toHaveAttribute('href', '/1396/breaking-bad');
  await expect(marked(page).getByText('↵')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL('/1396/breaking-bad');
  await expect(dialog(page)).toBeHidden();
});

test('Enter-ahead: Enter while pending opens the first result as soon as it lands', async ({
  page,
}) => {
  await enterAhead(page);
});

test('Enter-ahead shows the page’s shell at once, without waiting for its dynamic render', async ({
  page,
}) => {
  await enterAhead(page, { slowRender: true });
});

test('the query is normalised, so every spelling shares one CDN key', async ({
  page,
}) => {
  const urls = searchRequests(page);
  await open(page);
  await openSearch(page);
  const response = page.waitForResponse((res) =>
    res.url().includes('/api/search'),
  );

  await field(page).fill('  Breaking   BAD ');

  const res = await response;
  expect(urls).toEqual([
    expect.stringMatching(/\/api\/search\?q=breaking%20bad$/),
  ]);
  expect(res.headers()['cache-control']).toMatch(/s-maxage=\d+/);
  expect(res.headers()['cache-control']).not.toMatch(/(^|[ ,])max-age/);
});

test('a failed request shows the error row, and Try again asks again', async ({
  page,
}) => {
  const urls = searchRequests(page);
  await open(page);
  await openSearch(page);
  await field(page).fill('server error');

  await expect(
    dialog(page).getByText('Search didn’t load for “server error”.'),
  ).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Try again' }).click();
  await expect.poll(() => urls.length).toBe(2);
});

test('Back restores the query and the results', async ({ page }) => {
  await open(page);
  await openSearch(page);
  await field(page).fill('bre');
  await expect(marked(page)).toHaveAttribute('href', '/1396/breaking-bad');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/1396/breaking-bad');

  await page.goBack();
  await expect(page).toHaveURL('/');
  await openSearch(page);

  await expect(field(page)).toHaveValue('bre');
  await expect(option(page, /La Brea/)).toBeVisible();
});

test('people: a person as the best match comes first and opens the person page', async ({
  page,
}) => {
  await open(page);
  await openSearch(page);
  await field(page).fill('bryan');

  const groups = dialog(page).getByRole('group');
  await expect(groups.first()).toHaveAccessibleName('People');
  await expect(groups.nth(1)).toHaveAccessibleName('Series');
  await expect(marked(page)).toHaveAttribute(
    'href',
    '/person/17419/bryan-cranston',
  );
  await expect(marked(page)).toContainText('Actor');
  await expect(marked(page)).toContainText('Breaking Bad, Isle of Dogs');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL('/person/17419/bryan-cranston');
});

test('recents: what was opened comes back as a chip, unmarked until ↓', async ({
  page,
}) => {
  await open(page);
  await openSearch(page);
  await field(page).fill('the bear');
  await option(page, /^The Bear/).click();
  await expect(page).toHaveURL('/136315/the-bear');

  await openSearch(page);
  await expect(
    dialog(page).getByRole('group', { name: 'Recent' }),
  ).toBeVisible();
  await expect(marked(page)).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await expect(marked(page)).toHaveAttribute('href', '/136315/the-bear');
});

test('the keyboard grid: arrows move the marker, focus stays in the field', async ({
  page,
}) => {
  await open(page);
  await openSearch(page);
  await field(page).fill('bryan');
  await expect(marked(page)).toHaveAttribute(
    'href',
    '/person/17419/bryan-cranston',
  );

  await page.keyboard.press('ArrowRight');
  await expect(marked(page)).toHaveAttribute(
    'href',
    '/person/29092/bryan-brown',
  );
  // ↓ crosses from the people row to the same column in the posters
  await page.keyboard.press('ArrowDown');
  await expect(marked(page)).toHaveAttribute('href', '/236732/bryans-all-in');
  await page.keyboard.press('ArrowUp');
  await expect(marked(page)).toHaveAttribute(
    'href',
    '/person/29092/bryan-brown',
  );

  await expect(field(page)).toBeFocused();
  const active = await field(page).getAttribute('aria-activedescendant');
  await expect(marked(page)).toHaveAttribute('id', active ?? '');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/person/29092/bryan-brown');
});

test('nothing found is one line', async ({ page }) => {
  await open(page);
  await openSearch(page);
  await field(page).fill('brekaing bad');

  await expect(
    dialog(page).getByText('Nothing for “brekaing bad”'),
  ).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/');
});

test('the 404 field opens search with its query', async ({ page }) => {
  await open(page, '/the-bear-is-not-here');
  const notFoundField = page
    .getByRole('search')
    .getByRole('searchbox', { name: 'Search series and people' });
  await notFoundField.fill('the bear');
  await notFoundField.press('Enter');

  await expect(field(page)).toHaveValue('the bear');
  await expect(marked(page)).toHaveAttribute('href', '/136315/the-bear');
});

test('typing at once after opening keeps every key and lands results', async ({
  context,
  page,
}) => {
  await signInAs(context, 'alex');
  // A cold open: the idle preload never runs (an idle callback that never
  // fires, so no timer can preload it on a slow machine either), and the
  // overlay's code arrives 400 ms after the click, so the keys come before
  // its field exists.
  await page.addInitScript(() => {
    window.requestIdleCallback = () => 0;
    window.cancelIdleCallback = () => undefined;
  });
  let slowChunks = false;
  await page.route('**/_next/static/chunks/**', async (route) => {
    if (slowChunks) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    await route.continue();
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-search-listening',
    '',
  );
  await expect(page.locator('html')).not.toHaveAttribute('data-search-ready');
  slowChunks = true;
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Search' })
    .click();
  await page.keyboard.type('the bear', { delay: 20 });

  await expect(field(page)).toHaveValue('the bear');
  await expect(marked(page)).toHaveAttribute('href', '/136315/the-bear');
  await page.keyboard.press('Escape');
  slowChunks = false;

  // after a client navigation, the shortcut, then straight into typing
  await page.goto('/the-bear-is-not-here');
  // no idle preload here: hovering a search trigger loads it
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Search' })
    .hover();
  await expect(page.locator('html')).toHaveAttribute('data-search-ready', '');
  await page.getByRole('link', { name: 'tvseri.es home' }).click();
  await expect(page).toHaveURL('/');
  await page.keyboard.press('Control+k');
  await page.keyboard.type('bre', { delay: 20 });

  await expect(field(page)).toHaveValue('bre');
  await expect(marked(page)).toHaveAttribute('href', '/1396/breaking-bad');
});

test.describe('the Watched label on a result', () => {
  const library = {
    favorites: [],
    inProgress: [],
    watched: [1396],
    watchlist: [],
  };

  test('a fully watched show says so, signed in, and nothing else does', async ({
    page,
  }) => {
    await signInAs(page.context(), 'alex');
    // the viewer's library arrives from the browser (the results stay the
    // same cached answer for everyone)
    await page.route('**/api/me/library-ids', (route) =>
      route.fulfill({ json: library }),
    );
    await open(page);
    await openSearch(page);
    await field(page).fill('bre');
    await expect(option(page, /Breaking Bad/)).toContainText('Watched');
    await expect(option(page, /Breathe/)).not.toContainText('Watched');
  });

  test('signed out there is no label and no library request', async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/me/library-ids')) {
        requests.push(request.url());
      }
    });
    await open(page);
    await openSearch(page);
    await field(page).fill('bre');
    await expect(option(page, /Breaking Bad/)).toBeVisible();
    await expect(option(page, /Breaking Bad/)).not.toContainText('Watched');
    expect(requests).toEqual([]);
  });
});
