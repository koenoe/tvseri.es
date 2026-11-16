/**
 * GET /api/auth/login?returnTo=<path>
 *
 * Starts a login: remembers the OAuth state, PKCE verifier and return path in
 * the short-lived `__tvseries_login` cookie (scoped to the callback) and
 * redirects (302) to the auth server, which comes back to
 * `/api/auth/callback`.
 *
 * - `returnTo`: a same-origin path to land on afterwards (`toSafeReturnTo`).
 *   Without it, the same-origin path of the `Referer`; else `/`.
 * - A visitor who is already signed in goes straight to it (303), once
 *   `/me` confirms the user. A user the API says is gone (deleted in another
 *   browser) is signed out here and starts a real sign-in; when `/me` can't
 *   answer, the sign-in starts too (the callback replaces the session), so
 *   Sign in never leads back to a page that asked to sign in.
 * - The callback URL comes from the configured origin (`getBaseUrl()`), never
 *   from the Host header.
 * - Prefetches get a 204 and change nothing. Link to it with a plain
 *   `<a href>`, not `<Link>`.
 */
import type { NextRequest } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/auth/cookies';
import { startLogin } from '@/auth/login';
import { checkUser } from '@/auth/me';
import { toSafeReturnTo } from '@/auth/returnTo';
import { resolveSession } from '@/auth/session';
import { deleteSession } from '@/auth/sessionCookies';
import getBaseUrl from '@/lib/getBaseUrl';

import { redirect } from '../redirect';

const isPrefetch = (headers: Headers) =>
  headers.has('next-router-prefetch') ||
  headers.get('purpose') === 'prefetch' ||
  headers.get('sec-purpose')?.includes('prefetch') === true;

/** The path of a same-origin Referer, or null. */
function refererPath(req: NextRequest): string | null {
  const referer = req.headers.get('referer');
  if (!referer || !URL.canParse(referer)) {
    return null;
  }
  const url = new URL(referer);
  return url.origin === req.nextUrl.origin
    ? `${url.pathname}${url.search}`
    : null;
}

export async function GET(req: NextRequest): Promise<Response> {
  if (isPrefetch(req.headers)) {
    return new Response(null, {
      headers: { 'cache-control': 'no-store' },
      status: 204,
    });
  }

  const returnTo = toSafeReturnTo(
    req.nextUrl.searchParams.get('returnTo') ?? refererPath(req),
  );

  const session = await resolveSession(
    req.cookies.get(SESSION_COOKIE_NAME)?.value,
    { context: 'RouteHandler', mode: 'read-only' },
  );
  if (session.status === 'valid') {
    const check = await checkUser(session.tokens.accessToken);
    if (check.kind === 'user') {
      return redirect(returnTo, 303);
    }
    if (check.kind === 'gone') {
      await deleteSession();
    }
  }

  return redirect(await startLogin(getBaseUrl(), returnTo), 302);
}
