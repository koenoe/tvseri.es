import 'server-only';

import type { User } from '@tvseri.es/schemas';
import type { NextRequest } from 'next/server';
import { cache } from 'react';

import { SESSION_COOKIE_NAME } from './cookies';
import isLocalWithoutSecret from './localWithoutSecret';
import { fetchMe } from './me';
import {
  checkRequestToken,
  checkToken,
  readRequestSession,
  type TokenCheck,
} from './requestSession';
import {
  resolveSession,
  type SessionContext,
  type SessionState,
} from './session';

export type Session = Readonly<{
  accessToken: string;
  expiresAt: number;
  user: User;
}>;

const EMPTY_SESSION = {
  accessToken: null,
  expiresAt: null,
  user: null,
} as const;

export type EmptySession = typeof EMPTY_SESSION;

async function fetchUser(
  accessToken: string,
  context: SessionContext,
): Promise<User | null> {
  try {
    return await fetchMe(accessToken);
  } catch {
    console.log(`[auth] [${context}] fetchUser failed`);
    return null;
  }
}

async function verifyAccessToken(
  accessToken: string,
  context: SessionContext,
  check: (accessToken: string) => Promise<TokenCheck>,
): Promise<boolean> {
  const checked = await check(accessToken);
  if (checked.kind === 'unavailable') {
    console.log(`[auth] [${context}] verify unavailable:`, checked.error);
    return false;
  }
  if (checked.result.err) {
    console.log(`[auth] [${context}] verify failed:`, checked.result.err);
    return false;
  }
  return true;
}

/**
 * Turns a resolved session into a user session. Failures here (bad access
 * token, `/me` unavailable) only yield an empty session for this request;
 * they never delete the cookie; only a refused refresh (in the proxy) does.
 */
async function loadSession(
  state: SessionState,
  context: SessionContext,
  check: (accessToken: string) => Promise<TokenCheck>,
): Promise<Session | EmptySession> {
  if (state.status !== 'valid' && state.status !== 'refreshed') {
    return EMPTY_SESSION;
  }

  const { accessToken, expiresAt } = state.tokens;

  // Verification and `/me` are independent; run them together and discard the
  // user if verification fails. Freshly refreshed tokens were just issued by
  // the auth server, so they don't need verifying.
  const [verified, user] = await Promise.all([
    state.status === 'refreshed' ||
      verifyAccessToken(accessToken, context, check),
    fetchUser(accessToken, context),
  ]);

  if (!verified || !user) {
    return EMPTY_SESSION;
  }

  return { accessToken, expiresAt, user };
}

/**
 * RSC and server actions: read-only. The proxy runs before every request that
 * carries a session cookie and owns refreshing it, so the token is fresh here.
 * Deduped per request with `cache()`; the cookie and the token check are
 * shared with `getViewer()` (`requestSession.ts`).
 */
const authRSC = cache(
  async (): Promise<Session | EmptySession> =>
    loadSession(await readRequestSession(), 'RSC', checkRequestToken),
);

/**
 * Route handlers: read-only too. The proxy runs before every route handler
 * that reads the session (its matcher; `proxyMatcher.test.ts` checks them
 * all), refreshes there and forwards the new cookie on the request, so the
 * token in `req` is fresh. One refresher per request keeps rotation simple:
 * a second refresh here would only race the proxy's.
 */
async function authRouteHandler(
  req: NextRequest,
): Promise<Session | EmptySession> {
  const state = await resolveSession(
    req.cookies.get(SESSION_COOKIE_NAME)?.value,
    { context: 'RouteHandler', mode: 'read-only' },
  );
  return loadSession(state, 'RouteHandler', checkToken);
}

/**
 * The viewer's session, or an empty one (`user: null`).
 *
 * - `auth()`: RSC and server actions. Read-only: never refreshes (OpenAuth
 *   rotates refresh tokens and RSC can't write the new cookie). Reads
 *   `cookies()`, so call it inside a Suspense boundary, never at the top of a
 *   cached page or layout.
 * - `auth(req)`: route handlers. Read-only as well: the proxy refreshed the
 *   session before the handler ran (the route must be in its matcher).
 *
 * Only the proxy refreshes (`proxy.ts`).
 */
function auth(): Promise<Session | EmptySession>;
function auth(req: NextRequest): Promise<Session | EmptySession>;
function auth(req?: NextRequest): Promise<Session | EmptySession> {
  if (isLocalWithoutSecret()) {
    return Promise.resolve(EMPTY_SESSION);
  }
  if (req) {
    return authRouteHandler(req);
  }
  return authRSC();
}

export default auth;
