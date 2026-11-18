import { instant } from '@next/playwright';
import { devices, expect, test } from '@playwright/test';

import { findOverflow, formatProblems } from './helpers/overflow';
import { signInAs } from './helpers/session';
import { fontsSettled, pageSettled, phoneScrollbars } from './helpers/viewport';

/**
 * Settings: per user, so the frame (header, section
 * list, section title) is the static shell and everything of the viewer's
 * streams into holes. Signed out, every settings URL is the 401 page.
 */

const SIGN_IN_TITLE = 'Sign in, so we know your name.';

test.describe('settings signed out', () => {
  for (const url of ['/settings', '/settings/plex']) {
    test(`${url} asks to sign in (not the show page's 404)`, async ({
      page,
    }) => {
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole('heading', { level: 1, name: SIGN_IN_TITLE }),
      ).toBeVisible();
    });
  }
});

test.describe('settings signed in (desktop)', () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, 'alex');
  });

  // From lg `/settings` is Profile beside the sidebar in the static shell:
  // no redirect, no list frame first
  test('/settings is Profile on desktop from the first paint', async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto('/settings');
        await expect(page.getByTestId('route-settings-profile')).toBeVisible();
        await expect(
          page.getByRole('heading', { level: 2, name: 'Profile' }),
        ).toBeVisible();
      },
      { baseURL },
    );
    // the viewer's parts streamed in, and the URL never moved
    await expect(page.getByText('@alex · Alex Example')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/settings');
    // One canonical, on the page a visitor loads. Released from instant()'s
    // shell lock, Next renders the page's whole metadata (title, robots,
    // icons, canonical) into <head> again, and on a loaded machine the old
    // set is sometimes never removed: a testing-lock artefact, so the head
    // is read on a plain load
    await page.goto('/settings');
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute('href', /\/settings\/profile$/);
  });

  test('is instant on an initial page load', async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto('/settings/profile');
        await expect(page.getByTestId('route-settings-profile')).toBeVisible();
        await expect(
          page.getByRole('heading', { level: 2, name: 'Profile' }),
        ).toBeVisible();
        const nav = page.getByRole('navigation', { name: 'Settings' });
        await expect(
          nav.getByRole('link', { name: /Connected apps/ }),
        ).toBeVisible();
      },
      { baseURL },
    );
    // the viewer's parts stream in after the shell
    await expect(page.getByText('@alex · Alex Example')).toBeVisible();
  });

  for (const [url, title] of [
    ['/settings/streaming-services', 'Streaming services'],
    ['/settings/import', 'Import'],
    ['/settings/plex', 'Connected apps'],
    ['/settings/data', 'Your data'],
  ] as const) {
    test(`${url} is instant on an initial page load`, async ({
      page,
      baseURL,
    }) => {
      await instant(
        page,
        async () => {
          await page.goto(url);
          await expect(
            page.getByRole('heading', { level: 2, name: title }),
          ).toBeVisible();
        },
        { baseURL },
      );
    });
  }

  test('is instant on a client navigation between sections', async ({
    page,
  }) => {
    await page.goto('/settings/profile');
    const nav = page.getByRole('navigation', { name: 'Settings' });
    const services = nav.getByRole('link', { name: /Streaming services/ });
    await expect(services).toBeVisible();
    await instant(page, async () => {
      await services.click();
      await page.waitForURL(
        (url) => url.pathname === '/settings/streaming-services',
      );
      await expect(
        page.getByRole('heading', { level: 2, name: 'Streaming services' }),
      ).toBeVisible();
    });
    await expect(services).toHaveAttribute('aria-current', 'page');
  });

  test('the popular services fold with the shared chevron control', async ({
    page,
  }) => {
    await page.goto('/settings/streaming-services');
    const more = page.getByRole('button', { name: /^Show all \d+$/ });
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(more.locator('svg')).toHaveCount(1);
    await more.click();
    const fewer = page.getByRole('button', { name: 'Show fewer' });
    await expect(fewer).toHaveAttribute('aria-expanded', 'true');
    await expect(fewer.locator('svg')).toHaveClass(/rotate-180/);
  });

  // The stub's public lookup never learns a signed-in rename (its state is
  // per session), like a CDN that still holds the new name's 404: the
  // owner's own profile must come from their account
  test('after a rename the new profile works at once and the old one is gone', async ({
    page,
  }) => {
    await page.goto('/settings/profile');
    await page.getByLabel('Username').fill('alex-fox');
    const save = page.getByRole('button', { name: 'Save changes' });
    await expect(save).toHaveAttribute('aria-disabled', 'false');
    await save.click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();

    await page.goto('/u/alex-fox');
    await expect(
      page.getByRole('heading', { level: 1, name: /alex-fox$/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Edit profile' }),
    ).toBeVisible();

    await page.goto('/u/alex');
    await expect(
      page.getByText(/not found|doesn.t exist|404/i).first(),
    ).toBeVisible();
  });
});

test.describe('settings signed in (phone)', () => {
  const { defaultBrowserType: _browser, ...iPhone } = devices['iPhone 15'];
  test.use(iPhone);

  test.beforeEach(async ({ context }) => {
    await signInAs(context, 'alex');
  });

  test('/settings is the section list', async ({ page }) => {
    await page.goto('/settings');
    const nav = page.getByRole('navigation', { name: 'Settings' });
    await expect(nav.getByRole('link', { name: /Your data/ })).toBeVisible();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('a section pushes in under its top bar with ‹ Settings', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page
      .getByRole('navigation', { name: 'Settings' })
      .getByRole('link', { name: /Your data/ })
      .click();
    await page.waitForURL((url) => url.pathname === '/settings/data');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Your data' }),
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Settings' }),
    ).toBeHidden();
    await page.getByRole('link', { exact: true, name: 'Settings' }).click();
    await page.waitForURL((url) => url.pathname === '/settings');
  });
});

/**
 * "shows" in the header and in Your data are the shows you have watched
 * anything of (finished or in progress), the profile's "finished" is the
 * finished ones only: sam has 31 finished and 2 in progress.
 */
test.describe('settings show counts', () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, 'sam');
  });

  test('the header and Your data count every show watched, the preview only the finished', async ({
    page,
  }) => {
    await page.goto('/settings/data');
    await expect(page.getByText('33 series').first()).toBeVisible();
    const tile = page.locator('b', { hasText: /^33$/ }).locator('..');
    await expect(tile.getByText('series', { exact: true })).toBeVisible();
    await page.goto('/settings/profile');
    await expect(page.getByText(/820 episodes, 31 finished/)).toBeVisible();
  });
});

// Beside the nav at tablet width the app cards' status
// ("Not available yet") was squeezed into a word-wide column and ran under
// the pills. Below `xl` the pills take their own row; on a phone the toggle
// joins them (beside Details the status broke into "Not / available yet").
for (const width of [360, 800] as const) {
  test(`Connected apps: status and pills never overlap at ${width}px`, async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ height: 900, width });
    await phoneScrollbars(page, width);
    await signInAs(context, 'nina');
    await page.goto('/settings/plex');
    await fontsSettled(page);
    const statuses = page.getByText('Not available yet', { exact: true });
    await expect(statuses).toHaveCount(2);
    const pills = page.getByText('Coming next', { exact: true });
    // one line of the status's own type, whatever its font
    const lineHeight = await statuses
      .first()
      .evaluate((node) => Number.parseFloat(getComputedStyle(node).lineHeight));
    for (let index = 0; index < 2; index += 1) {
      const status = await statuses.nth(index).boundingBox();
      const pill = await pills.nth(index).boundingBox();
      expect(status && pill).toBeTruthy();
      if (status && pill) {
        const apart =
          status.x + status.width <= pill.x ||
          pill.x + pill.width <= status.x ||
          status.y + status.height <= pill.y ||
          pill.y + pill.height <= status.y;
        expect(apart).toBe(true);
        // the status reads on one line
        expect(status.height).toBeLessThan(lineHeight * 1.5);
      }
    }
    const problems = await findOverflow(page);
    expect(problems, formatProblems(problems)).toEqual([]);
  });
}

// At 360 the profile preview's logos and a long
// handle ran out of their card, and Import's "Prime / Video" tab hung out of
// its control (the drop zone's poster wall bleeds by design, so Import is
// measured at its tabs).
for (const width of [360] as const) {
  // nina: no import of hers is ever under way (another spec runs one as
  // alex, which swaps the upload step for the check), and the boxes are
  // read in one pass, so nothing can re-render between them
  test(`Import's file tabs stay inside their control at ${width}px`, async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });
    await phoneScrollbars(page, width);
    await signInAs(context, 'nina');
    await page.goto('/settings/import');
    const list = page.getByRole('tablist', { name: 'Where to get your file' });
    await expect(list).toBeVisible();
    await fontsSettled(page);
    const outside = await list.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return Array.from(node.querySelectorAll('[role="tab"]')).flatMap(
        (tab) => {
          const t = tab.getBoundingClientRect();
          const out =
            t.bottom > box.bottom + 1 ||
            t.right > box.right + 1 ||
            tab.scrollHeight > tab.clientHeight + 1;
          return out ? [tab.textContent ?? ''] : [];
        },
      );
    });
    expect(outside).toEqual([]);
  });

  for (const [path, viewer] of [
    ['/settings/profile', 'marathonwatcher-2026'],
  ] as const) {
    test(`${path} as ${viewer} holds its text at ${width}px`, async ({
      context,
      page,
    }) => {
      await page.setViewportSize({ height: 844, width });
      await phoneScrollbars(page, width);
      await signInAs(context, viewer);
      await page.goto(path);
      await pageSettled(page);
      const problems = await findOverflow(page);
      expect(problems, formatProblems(problems)).toEqual([]);
    });
  }
}

// The Last scrobble card's week (rae's stub week: a 12-episode binge, two
// empty days): a day's bar filters the list under the card, pressed again
// the latest marks come back, and the card stays inside a phone's width
test('Plex week: pressing a day filters the list, and it fits at 390px', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await phoneScrollbars(page, 390);
  await signInAs(context, 'rae');
  await page.goto('/settings/plex');
  const week = page.getByRole('group', { name: 'Your week on Plex' });
  const days = week.getByRole('button');
  await expect(days).toHaveCount(7);
  await expect(week.getByRole('button', { disabled: true })).toHaveCount(2);
  const latest = page.getByRole('list', { name: 'Latest Plex marks' });
  await expect(latest.getByRole('listitem')).toHaveCount(5);

  const binge = week.getByRole('button', { name: /: 12 episodes$/ });
  await binge.click();
  await expect(binge).toHaveAttribute('aria-pressed', 'true');
  const day = page.getByRole('list', { name: /^Plex marks on / });
  await expect(day.getByRole('listitem')).toHaveCount(12);
  // the binge bar's touch target is the column, taller than 44px
  const box = await binge.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await binge.click();
  await expect(binge).toHaveAttribute('aria-pressed', 'false');
  await expect(latest.getByRole('listitem')).toHaveCount(5);

  await fontsSettled(page);
  const problems = await findOverflow(page);
  expect(problems, formatProblems(problems)).toEqual([]);
});
