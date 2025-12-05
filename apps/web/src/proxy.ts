import { type NextRequest, NextResponse } from 'next/server';
import { client } from './auth/client';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_REFRESH_THRESHOLD,
} from './constants';
import { decryptToken, encryptToken } from './lib/token';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  // Read session cookie directly from request
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return res;
  }

  const payload = await decryptToken(sessionCookie);
  if (!payload) {
    // Invalid session, delete cookie
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  // Check if refresh is needed
  const now = Math.floor(Date.now() / 1000);
  const needsRefresh = payload.expiresAt - now <= SESSION_REFRESH_THRESHOLD;

  if (!needsRefresh) {
    return res;
  }

  const refreshed = await client.refresh(payload.refreshToken);

  if (refreshed.err || !refreshed.tokens) {
    // Refresh failed, delete cookie
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  // Encrypt and set new session
  const encrypted = await encryptToken({
    accessToken: refreshed.tokens.access,
    expiresAt: now + refreshed.tokens.expiresIn,
    refreshToken: refreshed.tokens.refresh,
  });

  res.cookies.set(SESSION_COOKIE_NAME, encrypted, SESSION_COOKIE_OPTIONS);

  return res;
}
