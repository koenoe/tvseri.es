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
  ],
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
    console.log('[auth] [proxy] invalid session, deleting cookie');
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.expiresAt - now;
  const needsRefresh = expiresIn <= SESSION_REFRESH_THRESHOLD;

  if (!needsRefresh) {
    // If we didn't refresh, we could verify the access token here to ensure it's still valid.
    // However, this would require an additional round-trip on each request, so we skip it for now.
    return res;
  }

  const refreshed = await client.refresh(payload.refreshToken);

  if (refreshed.err || !refreshed.tokens) {
    console.log(
      '[auth] [proxy] refresh failed, RT:',
      payload.refreshToken.slice(-5),
      refreshed.err ?? 'no tokens returned',
    );
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
