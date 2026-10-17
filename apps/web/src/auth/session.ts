import 'server-only';

import type { Tokens } from '@openauthjs/openauth/client';
import { cookies } from 'next/headers';
import { after } from 'next/server';
import {
  FETCH_TIMEOUT,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_REFRESH_THRESHOLD,
  USER_DISPLAY_COOKIE_NAME,
  USER_DISPLAY_COOKIE_OPTIONS,
} from '@/constants';
import { client } from './client';
import { decryptToken, encryptToken, type TokenPayload } from './crypto';

/**
 * - `none`: no session cookie.
 * - `invalid`: the cookie can't be decrypted or the auth server rejected the
 *   refresh token. The cookie must be deleted.
 * - `stale`: there is a session, but no usable access token right now (it
 *   expired and we may not or could not refresh). Keep the cookie.
 * - `valid`: the access token in the cookie can be used as is.
 * - `refreshed`: new tokens were issued. `cookie` MUST be persisted, because
 *   OpenAuth rotates refresh tokens and the old one is now spent.
 */
export type SessionState = Readonly<
  | { status: 'none' }
  | { status: 'invalid' }
  | { status: 'stale' }
  | { status: 'valid'; tokens: TokenPayload }
  | { status: 'refreshed'; tokens: TokenPayload; cookie: string }
>;

/**
 * - `read-only`: never refresh. Use it where the new cookie can't be written
 *   (RSC); refreshing there would spend the refresh token and lose its
 *   successor.
 * - `refresh`: refresh when the access token is (almost) expired. The caller
 *   must persist the cookie of a `refreshed` result.
 */
type ResolveMode = 'read-only' | 'refresh';

export type SessionContext = 'Proxy' | 'RouteHandler' | 'RSC';

const NONE: SessionState = { status: 'none' };
const INVALID: SessionState = { status: 'invalid' };
const STALE: SessionState = { status: 'stale' };

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function isExpired(tokens: TokenPayload): boolean {
  return tokens.expiresAt <= nowInSeconds();
}

function toTokenPayload({ access, expiresIn, refresh }: Tokens): TokenPayload {
  return {
    accessToken: access,
    expiresAt: nowInSeconds() + expiresIn,
    refreshToken: refresh,
  };
}

async function refreshSession(
  tokens: TokenPayload,
  context: SessionContext,
): Promise<SessionState> {
  let refreshed: Awaited<ReturnType<typeof client.refresh>>;

  try {
    refreshed = await client.refresh(tokens.refreshToken);
  } catch (error) {
    // Network error, timeout or 5xx: not a verdict on the session. Keep the
    // cookie and try again on the next request.
    console.log(
      `[auth] [${context}] refresh unavailable, keeping session:`,
      error,
    );
    return isExpired(tokens) ? STALE : { status: 'valid', tokens };
  }

  if (refreshed.err || !refreshed.tokens) {
    console.log(
      `[auth] [${context}] refresh rejected:`,
      refreshed.err ? refreshed.err.name : 'no tokens returned',
    );
    return INVALID;
  }

  const nextTokens = toTokenPayload(refreshed.tokens);

  return {
    cookie: await encryptToken(nextTokens),
    status: 'refreshed',
    tokens: nextTokens,
  };
}

/**
 * Single source of truth for reading (and, if allowed, refreshing) the
 * session cookie. Callers only map the result onto their cookie store.
 */
export async function resolveSession(
  cookie: string | undefined,
  options: Readonly<{ context: SessionContext; mode: ResolveMode }>,
): Promise<SessionState> {
  if (!cookie) {
    return NONE;
  }

  const tokens = await decryptToken(cookie);
  if (!tokens) {
    console.log(`[auth] [${options.context}] invalid session cookie`);
    return INVALID;
  }

  const expiresIn = tokens.expiresAt - nowInSeconds();

  if (expiresIn > SESSION_REFRESH_THRESHOLD) {
    return { status: 'valid', tokens };
  }

  if (options.mode === 'read-only') {
    return expiresIn > 0 ? { status: 'valid', tokens } : STALE;
  }

  return refreshSession(tokens, options.context);
}

/**
 * Create a new session (for callback route). Any display cookie left over is
 * dropped; the proxy fills it in from `/me` on the next request.
 */
export async function createSession(tokens: Tokens): Promise<void> {
  const cookieStore = await cookies();
  const encrypted = await encryptToken(toTokenPayload(tokens));
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, SESSION_COOKIE_OPTIONS);
  cookieStore.delete(USER_DISPLAY_COOKIE_NAME);
}

/**
 * Sets the display-only username cookie (see `USER_DISPLAY_COOKIE_NAME`).
 * Route handlers and server actions only.
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
  try {
    await fetch(`${process.env.AUTH_URL}/revoke`, {
      body: new URLSearchParams({ token: refreshToken }),
      method: 'POST',
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
  } catch (error) {
    console.log('[auth] revoke failed:', error);
  }
}

/**
 * Deletes the session (and display) cookie and, after the response, revokes its refresh
 * token on the auth server (best effort; logout never waits for or depends on
 * it).
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

/**
 * Writes the outcome of a `refresh`-mode `resolveSession` to the Next cookie
 * store (route handlers and server actions only; RSC can't set cookies).
 */
export async function persistSessionState(state: SessionState): Promise<void> {
  if (state.status === 'refreshed') {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, state.cookie, SESSION_COOKIE_OPTIONS);
    // Keep the display cookie's lifetime in step with the session's.
    const username = cookieStore.get(USER_DISPLAY_COOKIE_NAME)?.value;
    if (username) {
      await setUserDisplayCookie(username);
    }
  } else if (state.status === 'invalid') {
    // Only drop the cookie: the auth server just rejected this token, so
    // revoking it there would be pointless. Revoke is for explicit logout.
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(USER_DISPLAY_COOKIE_NAME);
  }
}
