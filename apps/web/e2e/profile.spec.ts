import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { signInAs, stubFault } from './helpers/session';
import {
  fontsSettled,
  pageSettled,
  phoneScrollbars,
  untilStable,
} from './helpers/viewport';

/**
 * The profile (`/u/{username}`). Signed out it is the 401 page
 * with the way to the public stats. Signed in, the frame (sidebar and
 * tab bar) is the static shell and everything about the viewer streams in.
 *
 * Signed-in tests sign in through the auth stub (`e2e/stub-auth`).
 */

/**
 * After an instant() scope on an initial load, the whole dynamic page
 * arrives in one RSC refresh, beside the tab bar's ~20 segment prefetches
 * the hydrated shell sends. With 14 workers on one machine over half the
 * runs took longer than the default 10s; none took 30s. Two thirds of the
 * test's own budget, so the slow clamp (`E2E_SLOW`) scales it too.
 */
const afterRelease = () => (test.info().timeout * 2) / 3;

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

  test('a tab is the same 401: the calendar too', async ({ page }) => {
    await page.goto('/u/juno/calendar');
    await expect(
      page.getByRole('heading', { name: /Sign in to see @juno’s profile/ }),
    ).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Up next' })).toBeVisible({
      timeout: afterRelease(),
    });
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
    // the overview's blocks went with the overview (the tail sits outside the aside)
    await expect(
      page.getByRole('region', { exact: true, name: 'Pick one' }),
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

  test('six tabs on your own profile, each a page of its own', async ({
    page,
  }) => {
    await page.goto('/u/alex');
    const tabs = page.getByRole('navigation', { name: 'Profile' });
    await expect(tabs.getByRole('link')).toHaveText([
      'Overview',
      'Calendar',
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

  // the identity is the same on every page: a sub-page keeps Watches on
  test('a sub-page keeps Watches on, as the overview does', async ({
    page,
  }) => {
    await page.goto('/u/alex');
    const sidebar = page.getByRole('complementary', { name: 'About alex' });
    await expect(sidebar.getByText('Watches on')).toBeVisible();
    for (const path of ['/u/alex/library', '/u/alex/history']) {
      await page.goto(path);
      await expect(
        sidebar.getByRole('link', { name: 'Edit profile' }),
      ).toBeVisible();
      await expect(sidebar.getByText('Watches on')).toBeVisible();
    }
  });

  // a client navigation keeps the page before hidden in the DOM, its
  // marker with it: back on the overview, it is the overview again
  test('the overview after a sub-page, by its tabs, is the overview again', async ({
    page,
  }) => {
    await page.goto('/u/alex');
    const frame = page.locator('[data-profile-frame]');
    const tabs = page.getByRole('navigation', { name: 'Profile' });
    await expect(frame).toHaveAttribute('data-profile-page', 'overview');
    await tabs.getByRole('link', { name: 'Library' }).click();
    await page.waitForURL('**/u/alex/library');
    await expect(frame).toHaveAttribute('data-profile-page', 'subpage');
    await tabs.getByRole('link', { name: 'Overview' }).click();
    await page.waitForURL((url) => url.pathname === '/u/alex');
    await expect(frame).toHaveAttribute('data-profile-page', 'overview');
    await expect(page.locator('[data-slot="profile-tail"]')).toBeVisible();
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { height: 844, width: 390 } });
    test.beforeEach(async ({ page }) => {
      await phoneScrollbars(page, 390);
    });

    test('a tab opens at the top of the page, not at the last tab’s place', async ({
      page,
    }) => {
      await page.goto('/u/alex/library');
      const tabs = page.getByRole('navigation', { name: 'Profile' });
      await expect(tabs).toBeVisible();
      // the identity above the tabs has streamed in: measured before it, the
      // tabs sat at the page's top and the target was -8 (CI)
      await pageSettled(page);
      // scrolled until the tabs reach the top of the screen
      const top = await tabs.evaluate(
        (nav) => nav.getBoundingClientRect().top + window.scrollY - 8,
      );
      expect(top).toBeGreaterThan(0);
      await page.evaluate((y) => window.scrollTo(0, y), top);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(top);
      await tabs.getByRole('link', { name: 'Overview' }).click();
      await page.waitForURL((url) => url.pathname === '/u/alex');
      await expect(page.locator('[data-slot="profile-tail"]')).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    });

    test('the tabs keep one size and the row scrolls the active one into view', async ({
      page,
    }) => {
      await page.goto('/u/alex/history');
      const nav = page.getByRole('navigation', { name: 'Profile' });
      const tabs = nav.getByRole('link');
      await expect(tabs).toHaveCount(6);
      await fontsSettled(page);
      const boxes = await tabs.evaluateAll((links) =>
        links.map((link) => link.getBoundingClientRect()),
      );
      const widths = new Set(boxes.map((box) => Math.round(box.width)));
      expect(widths.size).toBe(1);
      expect([...widths][0]).toBeGreaterThanOrEqual(63);
      const row = await nav.evaluate((element) => ({
        overflows: element.scrollWidth > element.clientWidth,
        scrolled: element.scrollLeft,
      }));
      expect(row.overflows).toBe(true);
      expect(row.scrolled).toBeGreaterThan(0);
      const active = await nav
        .getByRole('link', { name: 'History' })
        .boundingBox();
      const frame = await nav.boundingBox();
      expect(active?.x ?? 0).toBeGreaterThanOrEqual(frame?.x ?? 0);
      expect((active?.x ?? 0) + (active?.width ?? 0)).toBeLessThanOrEqual(
        (frame?.x ?? 0) + (frame?.width ?? 0),
      );
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
        page.getByRole('heading', { exact: true, name: 'Pick one' }),
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
 * make a phone's page scroll sideways, and a short Recently watched
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

  for (const width of [390]) {
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

const SIX_TABS = [
  'Overview',
  'Calendar',
  'Library',
  'History',
  'Circle',
  'Stats',
];

// Every tab on day 0 too: an empty page says how it fills. Stats opens on
// the year with nothing logged.
test('day 0 has all six tabs; Stats opens on an empty year', async ({
  page,
}) => {
  await signInAs(page.context(), 'nina');
  await page.goto('/u/nina');
  const tabs = page.getByRole('navigation', { name: 'Profile' });
  await expect(tabs.getByRole('link')).toHaveText(SIX_TABS);
  await tabs.getByRole('link', { name: 'Stats' }).click();
  await page.waitForURL(/\/u\/nina\/stats\/\d{4}$/);
  await expect(
    page.getByText(/^nina has nothing logged with a date in \d{4}\.$/),
  ).toBeVisible();
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
  ).toHaveText(SIX_TABS);
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
