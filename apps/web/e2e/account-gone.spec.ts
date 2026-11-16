import { type BrowserContext, expect, type Page, test } from '@playwright/test';

import {
  SESSION_COOKIE_NAME,
  USER_DISPLAY_COOKIE_NAME,
} from '../src/auth/cookies';
import { signInAs } from './helpers/session';

/**
 * Delete account (SETFinal) with the account signed in on two browsers. The
 * one that deletes keeps "Account deleted" until the person leaves; the
 * other, whose token the issuer still refreshes, ends signed out cleanly:
 * the header says Sign in, the proxy drops the session, and Sign in starts
 * a real sign-in instead of looping back. The stub refuses a deleted
 * viewer's token with the API's `AccountGone` 401 on every route.
 */

const SIGN_IN_TITLE = 'Sign in, so we know your name.';

const cookie = async (context: BrowserContext, name: string) =>
  (await context.cookies()).find((entry) => entry.name === name)?.value;

const headerSignIn = (page: Page) =>
  page.getByRole('banner').getByRole('link', { name: 'Sign in' }).first();

test('a deleted account ends cleanly on its other browsers', async ({
  baseURL,
  browser,
}) => {
  // Both contexts sign in within this test: one copy of the stub's state
  const here = await browser.newContext({ baseURL });
  const elsewhere = await browser.newContext({ baseURL });
  await signInAs(here, 'rae');
  await signInAs(elsewhere, 'rae');

  const other = await elsewhere.newPage();
  await other.goto('/settings/profile');
  await expect(
    other.getByRole('heading', { level: 2, name: 'Profile' }),
  ).toBeVisible();

  // Delete on the first browser
  const page = await here.newPage();
  await page.goto('/settings/data');
  await page.getByRole('button', { name: 'Delete account' }).click();
  await page.getByLabel('Type rae to confirm').fill('rae');
  await page.getByRole('button', { name: 'Delete my account' }).click();
  const notice = page
    .getByRole('status')
    .filter({ hasText: 'Account deleted' });
  await expect(notice).toBeVisible();
  // It used to be replaced by the 401 page about 0.4 s later
  await page.waitForTimeout(2000);
  await expect(notice).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: SIGN_IN_TITLE }),
  ).toHaveCount(0);
  expect(await cookie(here, SESSION_COOKIE_NAME)).toBeUndefined();
  await expect(headerSignIn(page)).toBeVisible();

  // The other browser still holds a token the issuer accepts
  await other.goto('/settings/profile');
  await expect(
    other.getByRole('heading', { level: 1, name: SIGN_IN_TITLE }),
  ).toBeVisible();
  // The browser forgets the account: Sign in, no handle, no hints
  await expect(headerSignIn(other)).toBeVisible();
  await expect
    .poll(() => cookie(elsewhere, USER_DISPLAY_COOKIE_NAME))
    .toBeUndefined();
  expect(
    await other.evaluate(() =>
      window.localStorage.getItem('tvseries:library-hint'),
    ),
  ).toBeNull();

  // The next request: the proxy asks /me and ends the session
  await other.goto('/');
  expect(await cookie(elsewhere, SESSION_COOKIE_NAME)).toBeUndefined();
  expect(await cookie(elsewhere, USER_DISPLAY_COOKIE_NAME)).toBeUndefined();

  // Sign in starts a real sign-in at the auth server, not a loop back
  await other.goto('/settings/profile');
  await other.route(
    (url) => url.pathname === '/authorize',
    (route) => route.fulfill({ body: 'auth server', status: 200 }),
  );
  const authorize = other.waitForRequest(
    (request) => new URL(request.url()).pathname === '/authorize',
  );
  await headerSignIn(other).click();
  await authorize;

  await here.close();
  await elsewhere.close();
});

test('Sign in on a still-valid session of a deleted account signs out first', async ({
  baseURL,
  browser,
}) => {
  const here = await browser.newContext({ baseURL });
  const elsewhere = await browser.newContext({ baseURL });
  await signInAs(here, 'rae');
  await signInAs(elsewhere, 'rae');

  const page = await here.newPage();
  await page.goto('/settings/data');
  await page.getByRole('button', { name: 'Delete account' }).click();
  await page.getByLabel('Type rae to confirm').fill('rae');
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Account deleted' }),
  ).toBeVisible();

  // Straight to the login route with both cookies still set (no page ran)
  const response = await elsewhere.request.get(
    '/api/auth/login?returnTo=/settings/profile',
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(302);
  expect(new URL(response.headers().location ?? '').pathname).toBe(
    '/authorize',
  );
  expect(await cookie(elsewhere, SESSION_COOKIE_NAME)).toBeUndefined();
  expect(await cookie(elsewhere, USER_DISPLAY_COOKIE_NAME)).toBeUndefined();

  await here.close();
  await elsewhere.close();
});
