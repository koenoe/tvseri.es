/**
 * GET /api/auth/callback?code=…&state=…
 *
 * Where the auth server sends the visitor back after `/api/auth/login`.
 * Always clears the login cookie. When `state` matches the login this browser
 * started, exchanges the code (PKCE), creates the session cookie and
 * redirects (302) to the login's return path; a sign-in that created the
 * account also gets the welcome cookie (the site's one-time toast).
 *
 * Never answers with JSON or text (where each failure sends the
 * person):
 * - `access_denied` (cancelled at Google, or a Google account without a
 *   verified email) starts a new login with a `notice`, so the sign-in page
 *   says what happened;
 * - any other error, a missing code, an unreachable auth server or a
 *   refused exchange goes to the “Sign-in broke” page, return path kept;
 * - a state mismatch (a login started in two tabs) goes home, as before.
 */
import type { Client } from '@openauthjs/openauth/client';
import { GOOGLE_UNVERIFIED_DESCRIPTION } from '@tvseri.es/constants';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

import { getAuthClient } from '@/auth/client';
import { WELCOME_COOKIE_NAME, WELCOME_COOKIE_OPTIONS } from '@/auth/cookies';
import { isFirstSignIn } from '@/auth/firstSignIn';
import { consumeLogin, LOGIN_CALLBACK_PATH, startLogin } from '@/auth/login';
import { checkUser } from '@/auth/me';
import { createSession, setUserDisplayCookie } from '@/auth/sessionCookies';
import getBaseUrl from '@/lib/getBaseUrl';

import { redirect, signInErrorPath } from '../redirect';

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Always clear the login cookie, also when the flow failed.
  const { returnTo, verified } = await consumeLogin(searchParams.get('state'));

  if (error === 'access_denied') {
    const notice =
      searchParams.get('error_description') === GOOGLE_UNVERIFIED_DESCRIPTION
        ? 'google_unverified'
        : 'google_cancelled';
    return redirect(await startLogin(getBaseUrl(), returnTo, notice), 302);
  }

  if (error || !code) {
    console.error('[auth] [Callback] sign-in failed:', error ?? 'no code');
    return redirect(signInErrorPath(returnTo), 302);
  }

  if (!verified) {
    // E.g. login started in two tabs: the cookie holds the other tab's state.
    // The state is unusable, so send the visitor home to click login again.
    return redirect('/', 302);
  }

  let exchanged: Awaited<ReturnType<Client['exchange']>>;
  try {
    // Must be the redirect URI the login started with (`startLogin`).
    exchanged = await getAuthClient().exchange(
      code,
      `${getBaseUrl()}${LOGIN_CALLBACK_PATH}`,
      verified.verifier,
    );
  } catch (err) {
    console.error('[auth] [Callback] exchange unavailable:', err);
    return redirect(signInErrorPath(returnTo), 302);
  }

  if (exchanged.err) {
    console.error('[auth] [Callback] exchange refused:', exchanged.err.name);
    return redirect(signInErrorPath(returnTo), 302);
  }

  await createSession(exchanged.tokens);

  // One request per sign-in (never per page view): the username for the
  // header's display cookie, and whether this sign-in created the account.
  // A failure only skips both; the proxy fills the display cookie in later.
  const check = await checkUser(exchanged.tokens.access);
  if (check.kind === 'user') {
    await setUserDisplayCookie(check.user.username);
    if (isFirstSignIn(check.user.createdAt, verified.startedAt)) {
      const cookieStore = await cookies();
      cookieStore.set(WELCOME_COOKIE_NAME, '1', WELCOME_COOKIE_OPTIONS);
    }
  }

  // `returnTo` is a validated same-origin path (see `toSafeReturnTo`).
  return redirect(returnTo, 302);
}
