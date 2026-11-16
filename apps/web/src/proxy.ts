import { type NextRequest, NextResponse } from 'next/server';

import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  USER_DISPLAY_COOKIE_NAME,
  USER_DISPLAY_COOKIE_OPTIONS,
} from './auth/cookies';
import isLocalWithoutSecret from './auth/localWithoutSecret';
import { checkUser } from './auth/me';
import {
  afterUserCheck,
  decide,
  isProtectedApiPath,
  type ProxyDecision,
} from './auth/proxyDecision';
import { resolveSession } from './auth/session';

export const config = {
  matcher: [
    // Protected user API routes run unconditionally, so logged-out callers
    // get a 401. User pages check the session themselves (`unauthorized()`).
    '/api/u/:path*',
    // The viewer's own data (marking reads, library ids): same 401 rule, and
    // the proxy refreshes the session before the handler reads it.
    '/api/me/:path*',
    // Other route handlers that read the session (`auth(req)`): they never
    // refresh themselves, the proxy does it first. Only with a session cookie.
    {
      has: [{ key: '__tvseries_session', type: 'cookie' }],
      source: '/api/(region|account/import)',
    },
    // Everywhere else the proxy only refreshes the session, so skip requests
    // without a session cookie (crawlers, anonymous visitors): each proxy run
    // is a billed function invocation. Prefetches are skipped too: they only
    // fetch the static/cached parts, and the navigation that follows still
    // runs the proxy (and refreshes the session). So are the Stats share
    // card and og:image: public, CDN-cached and cookie-less, while Vercel
    // runs the proxy before its cache, on every signed-in thumbnail view.
    {
      has: [
        // Must equal SESSION_COOKIE_NAME; matchers have to be static literals.
        { key: '__tvseries_session', type: 'cookie' },
      ],
      missing: [
        { key: 'next-router-prefetch', type: 'header' },
        { key: 'purpose', type: 'header', value: 'prefetch' },
      ],
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|sitemap.xml|robots.txt|u/[^/]+/stats/[^/]+/(?:card|opengraph-image)$).*)',
    },
    // A display cookie without a session cookie (e.g. one deleted by hand)
    // would show a logged-in header; this lets the proxy drop it. Rare, so
    // it costs anonymous visitors nothing.
    {
      has: [
        // Must equal USER_DISPLAY_COOKIE_NAME.
        { key: '__tvseries_user', type: 'cookie' },
      ],
      missing: [
        { key: 'next-router-prefetch', type: 'header' },
        { key: 'purpose', type: 'header', value: 'prefetch' },
      ],
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|sitemap.xml|robots.txt|u/[^/]+/stats/[^/]+/(?:card|opengraph-image)$).*)',
    },
  ],
};

function respond(
  req: NextRequest,
  session: ProxyDecision['session'],
  response: ProxyDecision['response'],
): NextResponse {
  if (response === 'unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (response === 'unavailable') {
    return NextResponse.json(
      { error: 'Session temporarily unavailable' },
      {
        headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '5' },
        status: 503,
      },
    );
  }
  if (session === 'keep') {
    return NextResponse.next();
  }
  // Forward the updated request cookies, so `cookies()` and `req.cookies`
  // downstream see the same session as the browser will.
  if (session === 'delete') {
    req.cookies.delete(SESSION_COOKIE_NAME);
  } else {
    req.cookies.set(SESSION_COOKIE_NAME, session.set);
  }
  return NextResponse.next({ request: { headers: req.headers } });
}

/**
 * The only place a session is refreshed: before every navigation, server
 * action and session-reading route handler (see `config.matcher`). Route
 * handlers and RSC read the cookie it forwards and never refresh themselves.
 * Concurrent requests with the same expired cookie share one refresh per
 * instance (`auth/refresh.ts`). Only an `invalid_grant`, or `/me` saying the
 * account is gone (`afterUserCheck`), ends the session; an outage never does.
 */
export async function proxy(req: NextRequest): Promise<NextResponse> {
  if (isLocalWithoutSecret()) {
    return isProtectedApiPath(req.nextUrl.pathname)
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.next();
  }
  const state = await resolveSession(
    req.cookies.get(SESSION_COOKIE_NAME)?.value,
    { context: 'Proxy', mode: 'refresh' },
  );
  const displayCookie = req.cookies.get(USER_DISPLAY_COOKIE_NAME)?.value;
  const facts = {
    displayCookie,
    hasDisplayCookie: displayCookie !== undefined,
    isProtectedApi: isProtectedApiPath(req.nextUrl.pathname),
  };
  let decision = decide(state, facts);
  let username: string | undefined;
  // The username for the display cookie comes from `/me`, which also says
  // whether the user still exists. Never derived from the session itself:
  // tokens don't carry the username.
  if (typeof decision.display === 'object') {
    const check = await checkUser(decision.display.renewWith);
    if (check.kind === 'gone') {
      console.log('[auth] [Proxy] account gone: session ended');
    }
    ({ decision, username } = afterUserCheck(decision, check, facts));
  }
  const { display, response, session } = decision;

  const res = respond(req, session, response);

  if (session === 'delete') {
    res.cookies.delete(SESSION_COOKIE_NAME);
  } else if (session !== 'keep') {
    res.cookies.set(SESSION_COOKIE_NAME, session.set, SESSION_COOKIE_OPTIONS);
  }

  if (display === 'delete') {
    res.cookies.delete(USER_DISPLAY_COOKIE_NAME);
  } else if (display !== 'keep' && username) {
    res.cookies.set(
      USER_DISPLAY_COOKIE_NAME,
      username,
      USER_DISPLAY_COOKIE_OPTIONS,
    );
  }

  return res;
}
