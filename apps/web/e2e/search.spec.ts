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
 * Search parity and the new rows, against the stub API (fixtures/search.ts). Playwright's
 * Desktop Chrome reports Windows, so the shortcut is Ctrl.
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

test('P-SR-1: Ctrl+K and Ctrl+F open and close search', async ({ page }) => {
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

test('P-SR-2: the header button and the floating pill open it', async ({
  page,
}) => {
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

test('P-SR-3: Escape closes and gives focus back to the button', async ({
  page,
}) => {
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

test('P-SR-4: Enter opens the marked first result (the ranking’s best match)', async ({
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

test('P-SR-5: Enter-ahead: Enter while pending opens the first result as soon as it lands', async ({
  page,
}) => {
  await enterAhead(page);
});

test('P-SR-5b: Enter-ahead shows the page’s shell at once, without waiting for its dynamic render', async ({
  page,
}) => {
  await enterAhead(page, { slowRender: true });
});

test('P-SR-6: one request per pause in typing; a newer one aborts the one in flight', async ({
  page,
}) => {
  const urls = searchRequests(page);
  const aborted: string[] = [];
  page.on('requestfailed', (request) => {
    if (request.url().includes('/api/search')) {
      aborted.push(request.url());
    }
  });
  await open(page);
  await openSearch(page);

  // The page's clock stands still while the word is typed, so no gap between
  // two keys is ever the 150ms pause the search waits for (on a slow machine
  // a stall between keys was one, and sent "breaki"); then the pause
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 60_000);
  await field(page).pressSequentially('breaking');
  await page.clock.resume();
  await expect(option(page, /^Breaking Bad/)).toBeVisible();
  expect(urls).toEqual([expect.stringContaining('/api/search?q=breaking')]);

  // hold this answer: a request in flight, then one more keystroke
  let release: () => void = () => {};
  await page.route('**/api/search?q=bryan%20cranston', (route) => {
    release = () => route.continue().catch(() => undefined);
  });
  const inFlight = page.waitForRequest(/q=bryan%20cranston/);
  await field(page).fill('bryan cranston');
  await inFlight;
  await field(page).press('End');
  await field(page).pressSequentially('x');
  await expect(
    dialog(page).getByText('Nothing for “bryan cranstonx”'),
  ).toBeVisible();
  expect(aborted).toEqual([expect.stringContaining('q=bryan%20cranston')]);
  release();
});

test('P-SR-7: the query is normalised, so every spelling shares one CDN key', async ({
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

test('P-SR-8: a failed request shows the error row, and Try again asks again', async ({
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

test('P-SR-9: Back restores the query and the results', async ({ page }) => {
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

test('P-SR-10: people: a person as the best match comes first and opens the person page', async ({
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

test('P-SR-11: recents: what was opened comes back as a chip, unmarked until ↓', async ({
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

test('P-SR-12: the keyboard grid: arrows move the marker, focus stays in the field', async ({
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

test('P-SR-13: nothing found is one line', async ({ page }) => {
  await open(page);
  await openSearch(page);
  await field(page).fill('brekaing bad');

  await expect(
    dialog(page).getByText('Nothing for “brekaing bad”'),
  ).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/');
});

test('P-SR-14: the 404 field opens search with its query', async ({ page }) => {
  await open(page, '/the-bear-is-not-here');
  const notFoundField = page
    .getByRole('search')
    .getByRole('searchbox', { name: 'Search series and people' });
  await notFoundField.fill('the bear');
  await notFoundField.press('Enter');

  await expect(field(page)).toHaveValue('the bear');
  await expect(marked(page)).toHaveAttribute('href', '/136315/the-bear');
});

for (const viewer of [null, 'alex'] as const) {
  test(`P-SR-15: typing at once after opening keeps every key and lands results (${viewer ?? 'signed out'})`, async ({
    context,
    page,
  }) => {
    if (viewer) {
      await signInAs(context, viewer);
    }
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
}

test('P-SR-16: it grows out of the header’s search icon and shrinks back into it (production’s motion)', async ({
  page,
}) => {
  await open(page);
  const icon = page.getByRole('banner').getByRole('button', { name: 'Search' });
  const box = await icon.boundingBox();
  await icon.click();
  // typing starts in the first frame of the grow
  await page.keyboard.type('bre', { delay: 10 });
  const panel = dialog(page).locator('.remote-surface');

  const { origin, panelLeft, panelTop } = await panel.evaluate((element) => ({
    origin: getComputedStyle(element).transformOrigin,
    panelLeft: (element as HTMLElement).offsetLeft,
    panelTop: (element as HTMLElement).offsetTop,
  }));
  const [x, y] = origin.split(' ').map(Number.parseFloat);
  expect(
    Math.abs(panelLeft + (x ?? 0) - ((box?.x ?? 0) + (box?.width ?? 0) / 2)),
  ).toBeLessThan(2);
  expect(
    Math.abs(panelTop + (y ?? 0) - ((box?.y ?? 0) + (box?.height ?? 0) / 2)),
  ).toBeLessThan(2);
  await expect(field(page)).toHaveValue('bre');
  await expect(panel).toHaveCSS('scale', 'none');

  await page.keyboard.press('Escape');
  await expect(panel).toHaveAttribute('data-closing', '');
  await expect(dialog(page)).toBeHidden();
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
