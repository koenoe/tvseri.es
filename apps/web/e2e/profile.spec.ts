import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { signInAs, stubFault } from './helpers/session';
import { fontsSettled, phoneScrollbars, untilStable } from './helpers/viewport';

/**
 * The profile (`/u/{username}`). Signed out it is the 401 page
 * with the way to the public stats. Signed in, the frame (sidebar and
 * tab bar) is the static shell and everything about the viewer streams in.
 *
 * Signed-in tests sign in through the auth stub (`e2e/stub-auth`).
 */

test.describe('profile signed out', () => {
  test('the frame is instant on an initial page load', async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto('/u/alex');
        await expect(
          page.getByRole('navigation', { name: 'Profile' }),
        ).toBeVisible();
      },
      { baseURL },
    );
  });

  test('shows the 401 with the way to the public stats', async ({ page }) => {
    await page.goto('/u/alex/history');
    await expect(
      page.getByRole('heading', { name: /Sign in to see @alex’s profile/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /See @alex’s stats/ }),
    ).toHaveAttribute('href', /\/u\/alex\/stats\/\d{4}$/);
  });

  // No dead ends: someone without stats has no stats page to link to
  test('offers no stats link when there are no stats to show', async ({
    page,
  }) => {
    await page.goto('/u/nina');
    await expect(
      page.getByText('@nina has no public stats yet.', { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /stats/ })).toHaveCount(0);
  });

  // a handle nobody has is the 404, never "sign in to see" them
  test('an unknown handle is the 404, not a sign-in prompt', async ({
    page,
  }) => {
    await page.goto('/u/nobody-by-this-name');
    await expect(
      page.getByText(/not found|doesn.t exist|404/i).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Sign in to see/ }),
    ).toHaveCount(0);
  });
});

test.describe('profile signed in', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page.context(), 'alex');
  });

  test('is instant on an initial load, then streams the owner page', async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto('/u/alex');
        await expect(
          page.getByRole('navigation', { name: 'Profile' }),
        ).toBeVisible();
      },
      { baseURL },
    );
    await expect(page.getByRole('heading', { name: 'Up next' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Edit profile' }),
    ).toBeVisible();
  });

  test('a tab is a client navigation that keeps the identity mounted', async ({
    page,
  }) => {
    await page.goto('/u/alex');
    const sidebar = page.getByRole('complementary', { name: 'About alex' });
    await expect(sidebar).toBeVisible();
    // the same node after the switch: the identity is the layout's, not the page's
    await page
      .locator('[data-slot="profile-identity"]')
      .evaluate((node) => node.setAttribute('data-kept', ''));
    await instant(page, async () => {
      await page
        .getByRole('navigation', { name: 'Profile' })
        .getByRole('link', { name: 'History' })
        .click();
      await page.waitForURL('**/u/alex/history');
      await expect(sidebar).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'History' }),
      ).toBeVisible();
    });
    await expect(
      page.locator('[data-slot="profile-identity"][data-kept]'),
    ).toHaveCount(1);
    // the overview's blocks went with the overview
    await expect(
      sidebar.getByRole('region', { name: 'Watchlist' }),
    ).toHaveCount(0);
  });

  test('the Library is instant on an initial load, and from the tab', async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto('/u/alex/library/watching');
        await expect(
          page.getByRole('navigation', { name: 'Profile' }),
        ).toBeVisible();
        await expect(
          page.locator('[data-placeholder="profile-identity"]'),
        ).toBeAttached();
      },
      { baseURL },
    );
    await expect(
      page.getByRole('link', { exact: true, name: 'Library' }),
    ).toHaveAttribute('aria-current', 'page');

    await page.goto('/u/alex');
    await expect(page.getByRole('heading', { name: 'Up next' })).toBeVisible();
    await instant(page, async () => {
      await page
        .getByRole('navigation', { name: 'Profile' })
        .getByRole('link', { name: 'Library' })
        .click();
      await page.waitForURL('**/u/alex/library');
      await expect(
        page.getByRole('complementary', { name: 'About alex' }),
      ).toBeVisible();
    });
    await expect(
      page.getByRole('heading', { level: 2, name: 'Watching' }),
    ).toBeVisible();
  });

  test('five tabs, each a page of its own', async ({ page }) => {
    await page.goto('/u/alex');
    const tabs = page.getByRole('navigation', { name: 'Profile' });
    await expect(tabs.getByRole('link')).toHaveText([
      'Overview',
      'Library',
      'History',
      'Circle',
      'Stats',
    ]);
    await expect(tabs.getByRole('link', { name: 'Library' })).toHaveAttribute(
      'href',
      '/u/alex/library',
    );
    await expect(tabs.getByRole('link', { name: 'Circle' })).toHaveAttribute(
      'href',
      '/u/alex/circle',
    );
    // the followers line leads to Circle too
    await expect(
      page.getByRole('link', { name: /followers · / }).first(),
    ).toHaveAttribute('href', '/u/alex/circle');
  });

  test('a sub-page drops Watches on; the overview keeps it', async ({
    page,
  }) => {
    await page.goto('/u/alex');
    const sidebar = page.getByRole('complementary', { name: 'About alex' });
    await expect(sidebar.getByText('Watches on')).toBeVisible();
    await page.goto('/u/alex/history');
    await expect(
      sidebar.getByRole('link', { name: 'Edit profile' }),
    ).toBeVisible();
    await expect(sidebar.getByText('Watches on')).toBeHidden();
  });

  // a client navigation keeps the page before hidden in the DOM, its
  // marker with it: back on the overview, it is the overview again
  test('the overview after a sub-page, by its tabs, keeps Watches on', async ({
    page,
  }) => {
    await page.goto('/u/alex');
    const sidebar = page.getByRole('complementary', { name: 'About alex' });
    const tabs = page.getByRole('navigation', { name: 'Profile' });
    await expect(sidebar.getByText('Watches on')).toBeVisible();
    await tabs.getByRole('link', { name: 'Library' }).click();
    await page.waitForURL('**/u/alex/library');
    await expect(sidebar.getByText('Watches on')).toBeHidden();
    await tabs.getByRole('link', { name: 'Overview' }).click();
    await page.waitForURL((url) => url.pathname === '/u/alex');
    await expect(sidebar.getByText('Watches on')).toBeVisible();
    await expect(page.locator('[data-slot="profile-tail"]')).toBeVisible();
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { height: 844, width: 390 } });
    test.beforeEach(async ({ page }) => {
      await phoneScrollbars(page, 390);
    });

    const tabBoxes = async (page: Page) => {
      await page.goto('/u/alex');
      const nav = page.getByRole('navigation', { name: 'Profile' });
      const tabs = nav.getByRole('link');
      await expect(tabs).toHaveCount(5);
      await fontsSettled(page);
      const boxes = await tabs.evaluateAll((links) =>
        links.map((link) => link.getBoundingClientRect()),
      );
      return { boxes, nav: await nav.boundingBox() };
    };

    test('the five tabs fit without scrolling, in equal columns', async ({
      page,
    }) => {
      const { boxes, nav } = await tabBoxes(page);
      const widths = boxes.map((box) => Math.round(box.width));
      expect(new Set(widths).size).toBe(1);
      const heights = boxes.map((box) => Math.round(box.height));
      expect(new Set(heights).size).toBe(1);
      // the bar holds its tabs
      expect(nav?.height ?? 0).toBeGreaterThanOrEqual(heights[0] ?? 0);
      const last = boxes.at(-1);
      expect((last?.right ?? 0) <= (nav?.x ?? 0) + (nav?.width ?? 0)).toBe(
        true,
      );
    });

    test('@design the five tabs are 50px tall in a 58px bar', async ({
      page,
    }) => {
      const { boxes, nav } = await tabBoxes(page);
      expect(boxes.map((box) => Math.round(box.height))).toEqual(
        Array(5).fill(50),
      );
      expect(nav?.height).toBe(58);
    });

    const identityGap = async (page: Page) => {
      await page.goto('/u/alex/history');
      const sidebar = page.getByRole('complementary', { name: 'About alex' });
      await expect(sidebar.getByRole('link', { name: 'Edit' })).toBeVisible();
      await expect(
        sidebar.getByText(/^[\d,]+ episodes · [\d,]+ finished$/),
      ).toBeVisible();
      await expect(
        sidebar.getByRole('link', { name: 'Edit profile' }),
      ).toBeHidden();
      await fontsSettled(page);
      const identity = await sidebar
        .getByRole('region', { name: 'Identity' })
        .boundingBox();
      const tabs = await page
        .getByRole('navigation', { name: 'Profile' })
        .boundingBox();
      return Math.round(
        (tabs?.y ?? 0) - (identity?.y ?? 0) - (identity?.height ?? 0),
      );
    };

    test('a sub-page shows the compact identity above the tabs', async ({
      page,
    }) => {
      expect(await identityGap(page)).toBeGreaterThanOrEqual(0);
    });

    test('@design the compact identity sits 16px above the tabs', async ({
      page,
    }) => {
      expect(await identityGap(page)).toBe(16);
    });

    test('the overview keeps the full identity', async ({ page }) => {
      await page.goto('/u/alex');
      await expect(
        page.getByRole('link', { name: 'Edit profile' }),
      ).toBeVisible();
    });

    /** The blocks' tops once each has streamed in */
    const tops = async (page: Page, names: ReadonlyArray<string>) => {
      for (const name of names) {
        await expect(
          page.locator(`[data-slot="${name}"]`).first(),
        ).toBeVisible();
      }
      await fontsSettled(page);
      return Promise.all(
        names.map(
          async (name) =>
            (await page.locator(`[data-slot="${name}"]`).first().boundingBox())
              ?.y ?? 0,
        ),
      );
    };
    const isAscending = (ys: ReadonlyArray<number>) =>
      ys.every((y, index) => index === 0 || y > (ys[index - 1] ?? 0));
    const tabsTop = async (page: Page) =>
      (await page.getByRole('navigation', { name: 'Profile' }).boundingBox())
        ?.y ?? 0;

    // one scroll in the DOM's order: identity, tabs, the page, then the
    // sidebar's last blocks
    test('your own overview reads top to bottom in its DOM order', async ({
      page,
    }) => {
      await page.goto('/u/alex');
      const ys = await tops(page, [
        'profile-identity',
        'up-next',
        'almost-done',
        'season-ledger',
        'paused',
        'out-now',
        'catching-up',
        'coming-up',
        'waiting-for',
        'from-your-circle',
        'favourites',
        'recently-watched',
        'watchlist',
        'this-year-so-far',
      ]);
      expect(isAscending(ys)).toBe(true);
      const tabs = await tabsTop(page);
      expect(tabs).toBeGreaterThan(ys[0] ?? 0);
      expect(tabs).toBeLessThan(ys[1] ?? 0);
      // Home has its own pick
      await expect(
        page.getByRole('heading', { name: 'Start something new' }),
      ).toBeHidden();
    });

    test('someone else’s overview has the match card above the tabs', async ({
      page,
    }) => {
      await page.goto('/u/juno');
      const ys = await tops(page, [
        'profile-identity',
        'your-match',
        'watching-now',
        'favourites',
        'watchlist',
        'this-year-so-far',
      ]);
      expect(isAscending(ys)).toBe(true);
      const tabs = await tabsTop(page);
      expect(tabs).toBeGreaterThan(ys[1] ?? 0);
      expect(tabs).toBeLessThan(ys[2] ?? 0);
    });
  });

  test('a tablet keeps the overview’s sidebar blocks', async ({ page }) => {
    await page.setViewportSize({ height: 1024, width: 800 });
    await page.goto('/u/alex');
    await expect(
      page.getByRole('heading', { name: 'Watchlist' }),
    ).toBeVisible();
  });

  test("someone else's profile is read as a match", async ({ page }) => {
    await page.goto('/u/juno');
    await expect(
      page.getByRole('heading', { name: 'Watching now' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
  });
});

/**
 * Real data is heavier than the tidy fixtures: sam has a 26-episode run in
 * Catching up with a long title, and a single watched episode. Nothing may
 * make the page scroll sideways at any width, and a short Recently watched
 * keeps its poster at tile size.
 */
test.describe('profile with real-data shapes', () => {
  const PATHS = [
    '/u/sam',
    '/u/sam/history',
    '/u/sam/library',
    '/u/sam/library/watching',
    '/u/sam/library/watchlist',
    '/u/sam/library/favourites',
    '/u/sam/library/finished',
    '/u/sam/circle',
  ];

  test.beforeEach(async ({ page }) => {
    await signInAs(page.context(), 'sam');
  });

  for (const width of [390, 1440]) {
    test(`never scrolls sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ height: 900, width });
      await phoneScrollbars(page, width);
      const widths = () =>
        page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
      for (const path of PATHS) {
        await page.goto(path);
        await expect(
          page.getByRole('navigation', { name: 'Profile' }),
        ).toBeVisible();
        // the streamed blocks have arrived and the page has stopped growing
        await untilStable(widths, { message: `${path} stops changing width` });
        const { clientWidth, scrollWidth } = await widths();
        expect(scrollWidth, path).toBeLessThanOrEqual(clientWidth);
      }
    });
  }

  test('a lone Recently watched poster keeps its tile size', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await page.goto('/u/sam');
    const list = page
      .getByRole('region', { name: 'Recently watched' })
      .locator('ul');
    await expect(list).toBeVisible();
    const tile = await list.locator('li').first().boundingBox();
    const row = await list.boundingBox();
    expect(tile?.width ?? 0).toBeLessThan((row?.width ?? 0) / 4);
  });
});

// No dead ends: no Circle without a follow either way, no Stats
// without a dated episode
test('day 0 has three tabs: Overview, Library, History', async ({ page }) => {
  await signInAs(page.context(), 'nina');
  await page.goto('/u/nina');
  await expect(
    page.getByRole('navigation', { name: 'Profile' }).getByRole('link'),
  ).toHaveText(['Overview', 'Library', 'History']);
});

/**
 * A Get started answer that isn't a status (no `steps`) is a failed read:
 * the block hides, as when the read fails, and the rest of the page draws.
 */
test('day 0: a broken Get started answer hides the block, never a crash', async ({
  page,
}) => {
  await signInAs(page.context(), 'nina');
  await stubFault('nina', {
    body: { hidden: false },
    mode: 'answer',
    path: '/me/get-started',
  });
  await page.goto('/u/nina');
  await expect(
    page.getByRole('navigation', { name: 'Profile' }).getByRole('link'),
  ).toHaveText(['Overview', 'Library', 'History']);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-placeholder]:visible')).toHaveCount(0);
  await expect(page.locator('[data-slot="get-started"]')).toHaveCount(0);
  await expect(
    page.getByRole('alert').filter({ hasText: 'didn’t load' }),
  ).toHaveCount(0);
  await expect(page.locator('#get-started')).toHaveCount(0);
});

/**
 * All three steps done: Get started is gone at once, as on Home (the API's
 * own `hidden` only follows days later), and nothing holds its place: Up
 * next opens the column.
 */
test('day 0: with all three steps done Get started is gone, no gap left', async ({
  page,
}) => {
  await signInAs(page.context(), 'nina');
  await stubFault('nina', {
    body: {
      doneAt: Date.now(),
      doneCount: 3,
      hidden: false,
      steps: { alreadySeen: true, history: true, services: true },
    },
    mode: 'answer',
    path: '/me/get-started',
  });
  await page.goto('/u/nina');
  const upNext = page.locator('section[aria-labelledby="up-next"]');
  await expect(upNext).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-slot="get-started"]')).toHaveCount(0);
  await expect(page.locator('[data-placeholder]:visible')).toHaveCount(0);
  expect(
    await upNext.evaluate(
      (node) => node.parentElement?.firstElementChild === node,
    ),
  ).toBe(true);
});

/**
 * Paused's Hide all with more shows than one answer took (28 here; it once
 * sent nothing past 20 and showed the error toast): every row leaves, the
 * toast says so with Undo, and Undo brings them back.
 */
test('Paused: Hide all hides every show at once, with Undo', async ({
  page,
}) => {
  await signInAs(page.context(), 'marathonwatcher-2026');
  await page.goto('/u/marathonwatcher-2026');
  const paused = page.getByRole('region', { name: 'Paused' });
  await paused.scrollIntoViewIfNeeded();
  await paused.getByRole('button', { name: 'Hide all' }).click();
  await expect(paused.getByText('Nothing paused')).toBeVisible();
  await expect(page.getByText('Hid 28 series from in progress')).toBeVisible();
  await expect(page.getByText(/^Couldn’t save that/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(
    paused.getByRole('button', { name: 'Show all 28' }),
  ).toBeVisible();
});

test.describe('a profile that doesn’t exist', () => {
  test('its 404 doesn’t name the user in the tab title', async ({ page }) => {
    await signInAs(page.context(), 'alex');
    await page.goto('/u/nobody-by-this-name');
    await expect(
      page.getByText(/not found|doesn.t exist|404/i).first(),
    ).toBeVisible();
    expect(await page.title()).not.toContain('@nobody-by-this-name');
  });

  test('a real profile keeps its title', async ({ page }) => {
    await signInAs(page.context(), 'alex');
    await page.goto('/u/juno/library/favourites');
    await expect(page).toHaveTitle(/@juno’s favourites/);
  });
});
