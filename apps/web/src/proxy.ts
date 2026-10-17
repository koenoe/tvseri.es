import { type NextRequest, NextResponse } from 'next/server';
import { client } from './auth/client';
import { decryptToken, encryptToken } from './auth/crypto';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_REFRESH_THRESHOLD,
} from './constants';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    '/api/u/:path*',
  ],
};

// User pages and user API routes require a session, except stats.
// Matches /u/:username(/...) and /api/u/:username(/...), but not .../stats(/...).
const PROTECTED_ROUTE = /^(?:\/api)?\/u\/[^/]+(?!\/stats(?:\/|$))(?:\/|$)/;

type SessionResult = Readonly<
  | { status: 'none' }
  | { status: 'invalid' }
  | { status: 'valid' }
  | { status: 'refreshed'; encrypted: string }
>;

async function resolveSession(req: NextRequest): Promise<SessionResult> {
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return { status: 'none' };
  }

  const payload = await decryptToken(sessionCookie);
  if (!payload) {
    console.log('[auth] [proxy] invalid session, deleting cookie');
    return { status: 'invalid' };
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.expiresAt - now;
  const needsRefresh = expiresIn <= SESSION_REFRESH_THRESHOLD;

  if (!needsRefresh) {
    // If we didn't refresh, we could verify the access token here to ensure it's still valid.
    // However, this would require an additional round-trip on each request, so we skip it for now.
    return { status: 'valid' };
  }

  const refreshed = await client.refresh(payload.refreshToken);

  if (refreshed.err || !refreshed.tokens) {
    console.log(
      '[auth] [proxy] refresh failed, RT:',
      payload.refreshToken.slice(-5),
      refreshed.err ?? 'no tokens returned',
    );
    return { status: 'invalid' };
  }

  const encrypted = await encryptToken({
    accessToken: refreshed.tokens.access,
    expiresAt: now + refreshed.tokens.expiresIn,
    refreshToken: refreshed.tokens.refresh,
  });

  return { encrypted, status: 'refreshed' };
}

function unauthenticatedResponse(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (!PROTECTED_ROUTE.test(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/', req.url));
}

export async function proxy(req: NextRequest) {
  const session = await resolveSession(req);

  switch (session.status) {
    case 'none':
      return unauthenticatedResponse(req);
    case 'invalid': {
      const res = unauthenticatedResponse(req);
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }
    case 'valid':
      return NextResponse.next();
    case 'refreshed': {
      const res = NextResponse.next();
      res.cookies.set(
        SESSION_COOKIE_NAME,
        session.encrypted,
        SESSION_COOKIE_OPTIONS,
      );
      return res;
    }
  }
}
