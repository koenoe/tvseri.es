import { instant } from '@next/playwright';
import { expect, test } from '@playwright/test';

import { signInAs, stubFault } from './helpers/session';

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

  test.describe('on a phone', () => {
    test.use({ viewport: { height: 844, width: 390 } });

    test('the five tabs fit without scrolling, in equal columns', async ({
      page,
    }) => {
      await page.goto('/u/alex');
      const tabs = page
        .getByRole('navigation', { name: 'Profile' })
        .getByRole('link');
      await expect(tabs).toHaveCount(5);
      const boxes = await tabs.evaluateAll((links) =>
        links.map((link) => link.getBoundingClientRect()),
      );
      const nav = await page
        .getByRole('navigation', { name: 'Profile' })
        .boundingBox();
      const widths = boxes.map((box) => Math.round(box.width));
      expect(new Set(widths).size).toBe(1);
      expect(boxes.map((box) => Math.round(box.height))).toEqual(
        Array(5).fill(50),
      );
      expect(nav?.height).toBe(58);
      const last = boxes.at(-1);
      expect((last?.right ?? 0) <= (nav?.x ?? 0) + (nav?.width ?? 0)).toBe(
        true,
      );
    });

    test('a sub-page shows the compact identity above the tabs', async ({
      page,
    }) => {
      await page.goto('/u/alex/history');
      const sidebar = page.getByRole('complementary', { name: 'About alex' });
      await expect(sidebar.getByRole('link', { name: 'Edit' })).toBeVisible();
      await expect(
        sidebar.getByText(/^[\d,]+ episodes · [\d,]+ finished$/),
      ).toBeVisible();
      await expect(
        sidebar.getByRole('link', { name: 'Edit profile' }),
      ).toBeHidden();
      // 16px from the identity to the tabs
      const identity = await sidebar
        .getByRole('region', { name: 'Identity' })
        .boundingBox();
      const tabs = await page
        .getByRole('navigation', { name: 'Profile' })
        .boundingBox();
      expect(
        Math.round(
          (tabs?.y ?? 0) - (identity?.y ?? 0) - (identity?.height ?? 0),
        ),
      ).toBe(16);
    });

    test('the overview keeps the full identity', async ({ page }) => {
      await page.goto('/u/alex');
      await expect(
        page.getByRole('link', { name: 'Edit profile' }),
      ).toBeVisible();
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
      for (const path of PATHS) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const { clientWidth, scrollWidth } = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
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
