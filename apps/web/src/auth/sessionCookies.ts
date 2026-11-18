import 'server-only';

import type { Tokens } from '@openauthjs/openauth/client';
import { cookies } from 'next/headers';
import { after } from 'next/server';

import { FETCH_TIMEOUT } from '@/lib/constants';

import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  USER_DISPLAY_COOKIE_NAME,
  USER_DISPLAY_COOKIE_OPTIONS,
} from './cookies';
import { decryptToken, encryptToken } from './crypto';
import { toTokenPayload } from './session';

/**
 * Adapters from session outcomes to Next's cookie store. Route handlers and
 * server actions only: RSC can't set cookies.
 */

/**
 * Create a new session (for the callback route). Any display cookie left over
 * (another account's) is dropped; the callback then sets it from `/me`
 * (`setUserDisplayCookie`), or the proxy does on a later request when that
 * read failed.
 */
export async function createSession(tokens: Tokens): Promise<void> {
  const cookieStore = await cookies();
  const encrypted = await encryptToken(toTokenPayload(tokens));
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, SESSION_COOKIE_OPTIONS);
  cookieStore.delete(USER_DISPLAY_COOKIE_NAME);
}

/**
 * Sets the display-only username cookie (see `USER_DISPLAY_COOKIE_NAME`),
 * e.g. after a rename (the profile action).
 */
export async function setUserDisplayCookie(username: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    USER_DISPLAY_COOKIE_NAME,
    username,
    USER_DISPLAY_COOKIE_OPTIONS,
  );
}

async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const authUrl = process.env.AUTH_URL;
  if (!authUrl) {
    return;
  }
  try {
    await fetch(`${authUrl}/revoke`, {
      body: new URLSearchParams({ token: refreshToken }),
      method: 'POST',
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
  } catch (error) {
    console.log('[auth] revoke failed:', error);
  }
}

/**
 * Deletes the session (and display) cookie and, after the response, revokes
 * its refresh token on the auth server (best effort; logout never waits for
 * or depends on it).
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(USER_DISPLAY_COOKIE_NAME);

  const tokens = cookie ? await decryptToken(cookie) : null;
  if (tokens) {
    after(() => revokeRefreshToken(tokens.refreshToken));
  }
}
