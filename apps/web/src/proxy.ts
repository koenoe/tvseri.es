import { type NextRequest, NextResponse } from 'next/server';
import { resolveSession } from './auth/session';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  USER_DISPLAY_COOKIE_NAME,
  USER_DISPLAY_COOKIE_OPTIONS,
} from './constants';
import { me } from './lib/api/me';

export const config = {
  matcher: [
    // Protected user API routes run unconditionally, so logged-out callers
    // get a 401. User pages check the session themselves (`unauthorized()`).
    '/api/u/:path*',
    // Everywhere else the proxy only refreshes the session, so skip requests
    // without a session cookie (crawlers, anonymous visitors): each proxy run
    // is a billed function invocation.
    {
      has: [
        // Must equal SESSION_COOKIE_NAME; matchers have to be static literals.
        { key: '__tvseries_session', type: 'cookie' },
      ],
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    },
    // A display cookie without a session cookie (e.g. one deleted by hand)
    // would show a logged-in header; this lets the proxy drop it. Rare, so
    // it costs anonymous visitors nothing.
    {
      has: [
        // Must equal USER_DISPLAY_COOKIE_NAME.
        { key: '__tvseries_user', type: 'cookie' },
      ],
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    },
  ],
};

// User API routes require a session. Matches /api/u/:username(/...), but not
// the public stats routes.
const PROTECTED_ROUTE = /^\/api\/u\/[^/]+(?!\/stats(?:\/|$))(?:\/|$)/;

// Forwards the (possibly updated) request cookies, so `cookies()` and
// `req.cookies` downstream see the same session as the browser will.
function nextWithRequestCookies(req: NextRequest): NextResponse {
  return NextResponse.next({ request: { headers: req.headers } });
}

// Response for a request without a usable session, or null when the route
// doesn't require one.
function unauthenticatedResponse(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;

  if (!PROTECTED_ROUTE.test(pathname)) {
    return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Keeps the display-only username cookie (see `USER_DISPLAY_COOKIE_NAME`)
 * next to the session cookie: the current value is re-set with the session's
 * lifetime, and a missing one (right after login, or a session from before
 * the cookie existed) is filled in from `/me`. Never overwritten from the
 * session itself: tokens don't carry the username, and a rename updates the
 * cookie in `updateProfile`.
 */
async function setUserDisplayCookie(
  req: NextRequest,
  res: NextResponse,
  accessToken: string,
): Promise<void> {
  const username =
    req.cookies.get(USER_DISPLAY_COOKIE_NAME)?.value ??
    (await me({ accessToken })
      .then((user) => user?.username)
      .catch(() => undefined));

  if (username) {
    res.cookies.set(
      USER_DISPLAY_COOKIE_NAME,
      username,
      USER_DISPLAY_COOKIE_OPTIONS,
    );
  }
}

export async function proxy(req: NextRequest) {
  const session = await resolveSession(
    req.cookies.get(SESSION_COOKIE_NAME)?.value,
    { context: 'Proxy', mode: 'refresh' },
  );

  switch (session.status) {
    case 'none': {
      const res = unauthenticatedResponse(req) ?? NextResponse.next();
      if (req.cookies.has(USER_DISPLAY_COOKIE_NAME)) {
        res.cookies.delete(USER_DISPLAY_COOKIE_NAME);
      }
      return res;
    }
    case 'invalid': {
      req.cookies.delete(SESSION_COOKIE_NAME);
      const res = unauthenticatedResponse(req) ?? nextWithRequestCookies(req);
      res.cookies.delete(SESSION_COOKIE_NAME);
      res.cookies.delete(USER_DISPLAY_COOKIE_NAME);
      return res;
    }
    // A stale session (auth server unreachable while the token is expired) is
    // still a session: keep the cookies and let the next request retry.
    case 'stale':
      return NextResponse.next();
    case 'valid': {
      const res = NextResponse.next();
      if (!req.cookies.has(USER_DISPLAY_COOKIE_NAME)) {
        await setUserDisplayCookie(req, res, session.tokens.accessToken);
      }
      return res;
    }
    case 'refreshed': {
      req.cookies.set(SESSION_COOKIE_NAME, session.cookie);
      const res = nextWithRequestCookies(req);
      res.cookies.set(
        SESSION_COOKIE_NAME,
        session.cookie,
        SESSION_COOKIE_OPTIONS,
      );
      await setUserDisplayCookie(req, res, session.tokens.accessToken);
      return res;
    }
  }
}
