import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';

/**
 * The header and footer in the static shell, the header's modes, and the
 * page colour's guard against a colour that is not one.
 */

const header = (page: Page) => page.locator('header[data-header-mode]');

// The display-only username cookie (auth/cookies.ts) gives the signed-in
// look. A production server's proxy drops it on every request without a
// session, so it is set in the page after the load; the header follows
// cookie changes (Cookie Store API).
const USERNAME = 'margaux';
const signIn = async (page: Page) => {
  // The cookie is a stand-in for the auth callback: with no session behind it,
  // the library request a tile makes (Watched labels) would clear it again.
  await page.route('**/api/me/library-ids', (route) =>
    route.fulfill({
      json: { favorites: [], inProgress: [], watched: [], watchlist: [] },
    }),
  );
  await page.evaluate((name) => {
    // biome-ignore lint/suspicious/noDocumentCookie: the test plays the auth callback
    document.cookie = `__tvseries_user=${name}; path=/`;
  }, USERNAME);
  await expect(
    page.getByRole('banner').getByRole('link', { name: USERNAME }),
  ).toBeVisible();
};

/** Placeholder pages are short: make this one tall, in the test only. */
const makeTall = (page: Page) =>
  page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '4000px';
    document.body.append(spacer);
  });

test.describe('static shell', () => {
  test('the header and footer of / are in the static shell', async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto('/');
        await expect(page.getByRole('banner')).toBeVisible();
        await expect(
          page.getByRole('link', { name: 'tvseri.es home' }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Search' }),
        ).toBeVisible();
        await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
        await expect(page.getByRole('contentinfo')).toBeVisible();
        await expect(page.getByRole('link', { name: 'TMDB' })).toBeVisible();
      },
      { baseURL },
    );
  });

  test('the server HTML is the same signed in and out', async ({ request }) => {
    const signedOut = await (await request.get('/discover')).text();
    const signedIn = await (
      await request.get('/discover', {
        headers: { cookie: `__tvseries_user=${USERNAME}` },
      })
    ).text();

    expect(signedIn).not.toContain(USERNAME);
    const shell = (html: string) =>
      html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
    expect(shell(signedIn)).toBe(shell(signedOut));
    expect(shell(signedOut)).not.toBe('');
  });
});

test.describe('header', () => {
  test('signed out: Sign in returns to the current page', async ({ page }) => {
    await open(page, '/discover');
    const signInLink = page.getByRole('link', { name: 'Sign in' });
    await signInLink.hover();
    await expect(signInLink).toHaveAttribute(
      'href',
      '/api/auth/login?returnTo=%2Fdiscover',
    );
  });

  test('signed in: the username links to the profile', async ({ page }) => {
    await open(page, '/discover');
    await signIn(page);
    await expect(
      page.getByRole('banner').getByRole('link', { name: USERNAME }),
    ).toHaveAttribute('href', `/u/${USERNAME}`);
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
  });
});

test.describe('header modes', () => {
  test('scrolling down past 60px hides it, scrolling up shows the pill, a navigation resets it', async ({
    page,
  }) => {
    await open(page, '/');
    await expect(header(page)).toHaveAttribute('data-header-mode', 'static');

    // The spacer is not React's, so it survives the client navigation below.
    await makeTall(page);
    await page.mouse.move(600, 400);

    await page.mouse.wheel(0, 40);
    await expect(header(page)).toHaveAttribute('data-header-mode', 'static');

    await page.mouse.wheel(0, 800);
    await expect(header(page)).toHaveAttribute('data-header-mode', 'hidden');

    await page.mouse.wheel(0, -200);
    await expect(header(page)).toHaveAttribute('data-header-mode', 'floating');
    await expect(header(page)).toHaveCSS('position', 'fixed');
    await expect(
      page.getByRole('link', { name: 'tvseri.es home' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('link', { name: 'Discover' }).click();
    await page.waitForURL((url) => url.pathname === '/discover');
    await expect(header(page)).toHaveAttribute('data-header-mode', 'static');
  });

  test('keyboard focus moving into the hidden header shows the pill', async ({
    page,
  }) => {
    await open(page, '/discover');
    await makeTall(page);
    await page.mouse.move(600, 400);
    await page.mouse.wheel(0, 20);
    await page.mouse.wheel(0, 800);
    await expect(header(page)).toHaveAttribute('data-header-mode', 'hidden');

    await page.getByRole('link', { name: 'tvseri.es home' }).focus();
    await expect(header(page)).toHaveAttribute('data-header-mode', 'floating');
  });
});

test.describe('page colour', () => {
  const GROUND = 'rgb(28, 34, 35)';
  const bodyColour = (page: Page) =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  test('a colour that is not a six-digit hex paints the ground', async ({
    page,
  }) => {
    // The stub's 900099 (fixtures/show-hero.ts) sends a CSS injection.
    await page.goto('/900099/bad-colour');
    expect(await bodyColour(page)).toBe(GROUND);
    expect(await page.content()).not.toContain('evil.example');
  });
});
