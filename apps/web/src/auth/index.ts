import { subjects, type User } from '@tvseri.es/schemas';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { cache } from 'react';
import { SESSION_COOKIE_NAME } from '../constants';
import { me } from '../lib/api';
import { client } from './client';
import {
  persistSessionState,
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

async function fetchUser(accessToken: string): Promise<User | null> {
  try {
    return await me({ accessToken });
  } catch {
    return null;
  }
}

async function verifyAccessToken(
  accessToken: string,
  context: SessionContext,
): Promise<boolean> {
  try {
    const verified = await client.verify(subjects, accessToken);
    if (verified.err) {
      console.log(`[auth] [${context}] verify failed:`, verified.err);
      return false;
    }
    return true;
  } catch (error) {
    console.log(`[auth] [${context}] verify unavailable:`, error);
    return false;
  }
}

/**
 * Turns a resolved session into a user session. Failures here (bad access
 * token, `/me` unavailable) only yield an empty session for this request;
 * they never delete the cookie; only a rejected refresh does that.
 */
async function loadSession(
  state: SessionState,
  context: SessionContext,
): Promise<Session | EmptySession> {
  if (state.status !== 'valid' && state.status !== 'refreshed') {
    return EMPTY_SESSION;
  }

  const { accessToken, expiresAt } = state.tokens;

  // Verification and `/me` are independent; run them together and discard the
  // user if verification fails. Freshly refreshed tokens were just issued by
  // the auth server, so they don't need verifying.
  const [verified, user] = await Promise.all([
    state.status === 'refreshed' || verifyAccessToken(accessToken, context),
    fetchUser(accessToken),
  ]);

  if (!verified) {
    return EMPTY_SESSION;
  }

  if (!user) {
    console.log(`[auth] [${context}] fetchUser failed`);
    return EMPTY_SESSION;
  }

  return {
    accessToken,
    expiresAt,
    user,
  };
}

/**
 * RSC and server actions: read-only. The proxy runs before every request that
 * carries a session cookie and owns refreshing it, so the token is fresh here.
 * Deduped per request with `cache()`.
 */
const authRSC = cache(async (): Promise<Session | EmptySession> => {
  const cookieStore = await cookies();
  const state = await resolveSession(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
    { context: 'RSC', mode: 'read-only' },
  );
  return loadSession(state, 'RSC');
});

/**
 * Route handlers can write cookies, and most `/api` routes are outside the
 * proxy matcher, so they refresh (and persist) the session themselves.
 */
async function authRouteHandler(
  req: NextRequest,
): Promise<Session | EmptySession> {
  const state = await resolveSession(
    req.cookies.get(SESSION_COOKIE_NAME)?.value,
    { context: 'RouteHandler', mode: 'refresh' },
  );
  await persistSessionState(state);
  return loadSession(state, 'RouteHandler');
}

// Overloaded auth function
function auth(): Promise<Session | EmptySession>;
function auth(req: NextRequest): Promise<Session | EmptySession>;
function auth(req?: NextRequest): Promise<Session | EmptySession> {
  if (req) {
    return authRouteHandler(req);
  }
  return authRSC();
}

export default auth;
