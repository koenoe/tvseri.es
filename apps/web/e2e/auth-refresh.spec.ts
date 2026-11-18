import { type BrowserContext, expect, type Page, test } from '@playwright/test';

import {
  SESSION_COOKIE_NAME,
  USER_DISPLAY_COOKIE_NAME,
} from '../src/auth/cookies';
import { signInRotating } from './helpers/session';

/**
 * Session refresh against an auth stub whose refresh tokens rotate like the
 * real issuer's (single use, reuse window; `stub-auth/rotation.ts`). Each test
 * starts with an access token that has already expired, so the next request
 * that may refresh does.
 */

const SIGN_IN_TITLE = 'Sign in, so we know your name.';

const sessionCookie = async (context: BrowserContext) =>
  (await context.cookies()).find(({ name }) => name === SESSION_COOKIE_NAME);

const displayCookie = async (context: BrowserContext) =>
  (await context.cookies()).find(
    ({ name }) => name === USER_DISPLAY_COOKIE_NAME,
  );

/**
 * One burst of what a page fires at once when the access token has expired:
 * documents, an RSC navigation, an RSC prefetch, route handlers and a server
 * action POST (an unknown action id: the proxy runs before Next resolves it).
 * All carry the same (expired) session cookie.
 */
const BURST = [
  { headers: { accept: 'text/html' }, url: '/' },
  { headers: { accept: 'text/html' }, url: '/settings' },
  { headers: { rsc: '1' }, url: '/discover?_rsc=burst1' },
  { headers: { 'next-router-prefetch': '1', rsc: '1' }, url: '/?_rsc=burst2' },
  { headers: {}, url: '/api/me/library-ids' },
  { headers: {}, url: '/api/me/library-ids' },
  { headers: {}, url: '/api/region' },
  {
    body: '[]',
    headers: { 'next-action': '0'.repeat(42) },
    method: 'POST',
    url: '/',
  },
] as const;

const fireBurst = (page: import('@playwright/test').Page) =>
  page.evaluate(async (burst) => {
    const results = await Promise.allSettled(
      burst.map((item) =>
        fetch(item.url, {
          body: 'body' in item ? item.body : undefined,
          credentials: 'same-origin',
          headers: item.headers,
          method: 'method' in item ? item.method : 'GET',
          redirect: 'manual',
        }).then(async (response) => {
          await response.arrayBuffer();
          return response.status;
        }),
      ),
    );
    return results.map((result) =>
      result.status === 'fulfilled' ? result.value : 'failed',
    );
  }, BURST);

/** A same-origin page that never runs the proxy, to fire fetches from. */
const ORIGIN_PAGE = '/robots.txt';

/**
 * `/settings` signed in: Profile beside the sidebar (from lg it renders in
 * place, no redirect) with the viewer's own line streamed in. Signed out it
 * would be the sign-in page.
 */
async function expectSignedInSettings(page: Page) {
  await expect(page.getByTestId('route-settings-profile')).toBeVisible();
  await expect(page.getByText('@alex · Alex Example').first()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/settings');
}

test.describe('session refresh', () => {
  test('a burst of requests after expiry refreshes once and stays signed in', async ({
    baseURL,
    context,
    page,
  }) => {
    await page.goto(ORIGIN_PAGE);
    const session = await signInRotating(context, 'alex', baseURL ?? '');

    await fireBurst(page);

    const stats = await session.stats();
    expect.soft(stats.rejected).toBe(0);
    // One server instance: every request of the burst shares one refresh.
    expect.soft(stats.calls).toBe(1);
    expect((await sessionCookie(context))?.value).not.toBe(session.cookie);

    const libraryIds = await page.evaluate(
      async () => (await fetch('/api/me/library-ids')).status,
    );
    expect(libraryIds).toBe(200);
    await page.goto('/settings');
    await expectSignedInSettings(page);
  });

  test('without an issuer reuse window, a burst still keeps the session', async ({
    baseURL,
    context,
    page,
  }) => {
    await page.goto(ORIGIN_PAGE);
    const session = await signInRotating(context, 'alex', baseURL ?? '', {
      reuseSeconds: 0,
    });

    await fireBurst(page);

    const stats = await session.stats();
    expect.soft(stats.rejected).toBe(0);
    expect.soft(stats.calls).toBe(1);
    expect(await sessionCookie(context)).toBeDefined();
    const libraryIds = await page.evaluate(
      async () => (await fetch('/api/me/library-ids')).status,
    );
    expect(libraryIds).toBe(200);
  });

  test('an auth server error keeps the session for the next request', async ({
    baseURL,
    context,
    page,
  }) => {
    const session = await signInRotating(context, 'alex', baseURL ?? '');
    await session.fault(503);

    await page.goto('/settings');

    expect((await sessionCookie(context))?.value).toBe(session.cookie);
    expect(await displayCookie(context)).toBeDefined();

    await session.fault();
    await page.goto('/settings');
    await expectSignedInSettings(page);
    expect((await session.stats()).issued).toBe(1);
  });

  test('a rotation the browser never received, then the reuse window passing, signs out cleanly', async ({
    baseURL,
    context,
    page,
  }) => {
    const session = await signInRotating(context, 'alex', baseURL ?? '');

    // A refresh whose answer (and new cookie) never reached the browser: an
    // aborted request or closed tab on another server instance, or on a dev
    // server that has restarted since (a fresh process remembers nothing).
    await session.spendElsewhere();
    expect(await session.stats()).toMatchObject({ calls: 1, issued: 1 });

    await session.lapse();

    const response = await page.goto('/settings');
    expect(response?.status()).toBe(200);
    expect(page.url()).toBe(`${baseURL}/settings`);
    await expect(
      page.getByRole('heading', { level: 1, name: SIGN_IN_TITLE }),
    ).toBeVisible();
    expect(await sessionCookie(context)).toBeUndefined();
    expect(await displayCookie(context)).toBeUndefined();
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Sign in' }).first(),
    ).toBeVisible();

    // No retry loop: the cookie is gone, so nothing refreshes again.
    await page.goto('/');
    expect(await session.stats()).toMatchObject({ calls: 2, rejected: 1 });
  });

  test('a rotation the browser never received heals within the reuse window', async ({
    baseURL,
    context,
    page,
  }) => {
    const session = await signInRotating(context, 'alex', baseURL ?? '');
    await session.spendElsewhere();

    await page.goto('/settings');

    await expectSignedInSettings(page);
    expect(await session.stats()).toMatchObject({
      calls: 2,
      issued: 2,
      rejected: 0,
    });
  });

  test('a session that ends mid-use: a mark asks to sign in and keeps the place', async ({
    baseURL,
    context,
    page,
  }) => {
    const show = '/136315/the-bear';
    // Ten minutes left: no refresh while the page loads, however slowly
    const session = await signInRotating(context, 'alex', baseURL ?? '', {
      accessSeconds: 600,
    });
    // the page's own background read of the viewer's library: done before
    // the session runs low, or it is the request that meets the end
    const libraryRead = page.waitForResponse((response) =>
      response.url().includes('/api/me/library-ids'),
    );
    await page.goto(show);
    const progress = page
      .getByRole('button', { name: /open watch history/ })
      .first();
    await expect(progress).toContainText('21 of 47');
    await libraryRead;
    expect((await session.stats()).calls).toBe(0);

    // Mid-use the session runs low: the browser's cookie now holds a token
    // of the same session (its namespace) with 30 s left, under the 60 s
    // refresh threshold but still valid, so the next request refreshes, and
    // the session is revoked, so that fails. (Not waited out by the clock:
    // a slow load would refresh early.)
    await signInRotating(context, 'alex', baseURL ?? '', {
      accessSeconds: 30,
    });
    await session.revoke();
    await page
      .getByRole('button', { name: 'More actions for The Bear' })
      .first()
      .click();
    await page.keyboard.press('n');

    // Not a silent failure: the prompt, and the page is signed out now (the
    // action's response deleted the cookie and Next re-rendered the page).
    await expect(
      page.getByText('Please sign in to use this feature'),
    ).toBeVisible();
    await expect(progress).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe(show);
    expect(await sessionCookie(context)).toBeUndefined();
    expect(await session.stats()).toMatchObject({ calls: 1, rejected: 1 });

    // Sign in comes back to this show.
    const login = page.waitForRequest(/\/api\/auth\/login/);
    // The toast's action (the header's Sign in is a link).
    await page.getByRole('button', { name: 'Sign in' }).click();
    expect(new URL((await login).url()).searchParams.get('returnTo')).toBe(
      show,
    );
  });

  test('a revoked session signs out cleanly on the next navigation', async ({
    baseURL,
    context,
    page,
  }) => {
    const session = await signInRotating(context, 'alex', baseURL ?? '');
    await session.revoke();

    const response = await page.goto('/settings/profile');
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1, name: SIGN_IN_TITLE }),
    ).toBeVisible();
    expect(await sessionCookie(context)).toBeUndefined();
    expect(await displayCookie(context)).toBeUndefined();

    const libraryIds = await page.evaluate(
      async () => (await fetch('/api/me/library-ids')).status,
    );
    expect(libraryIds).toBe(401);
    expect(await session.stats()).toMatchObject({ calls: 1, rejected: 1 });
  });
});
