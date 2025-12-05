import { AUTH_TTL } from '@tvseri.es/constants';
import { subjects, type User } from '@tvseri.es/schemas';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { cache } from 'react';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_REFRESH_THRESHOLD,
} from '../constants';
import { me } from '../lib/api';
import { decryptToken, encryptToken } from '../lib/token';
import { client } from './client';

type Session = {
  accessToken: string;
  expiresAt: number;
  user: User;
};

const EMPTY_SESSION = {
  accessToken: null,
  expiresAt: null,
  user: null,
} as const;

type EmptySession = typeof EMPTY_SESSION;

// Create a new session (for callback route)
export async function createSession(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  console.log(
    '[auth] createSession, AT:',
    accessToken.slice(-5),
    'RT:',
    refreshToken.slice(-5),
  );
  const cookieStore = await cookies();
  const expiresAt = Math.floor(Date.now() / 1000) + AUTH_TTL.access;
  const encrypted = await encryptToken({
    accessToken,
    expiresAt,
    refreshToken,
  });
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, SESSION_COOKIE_OPTIONS);
}

// Delete session (for logout)
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

async function fetchUser(accessToken: string): Promise<User | null> {
  try {
    return await me({ accessToken });
  } catch {
    return null;
  }
}

// Cookie jar abstraction for different contexts
type CookieJar = {
  get: () => string | undefined;
  set: (value: string) => void;
  delete: () => void;
};

type VerifyContext = 'RSC' | 'RouteHandler' | 'Middleware';

async function verifySession(
  cookieJar: CookieJar,
  options: {
    context: VerifyContext;
    readOnly?: boolean;
  },
): Promise<Session | EmptySession> {
  const sessionCookie = cookieJar.get();

  if (!sessionCookie) {
    return EMPTY_SESSION;
  }

  const payload = await decryptToken(sessionCookie);
  if (!payload) {
    return EMPTY_SESSION;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.expiresAt - now;
  const isExpired = expiresIn <= 0;

  // RSC is read-only: if expired, return empty session immediately.
  // Although we could technically refresh in RSC (just not persist the new cookie),
  // OpenAuth always rotates refresh tokens on each refresh. If we refresh but can't
  // persist the new RT, the old RT becomes invalid and the user gets logged out.
  if (options.readOnly && isExpired) {
    console.log(
      `[auth] [${options.context}] session expired (readOnly), AT:`,
      payload.accessToken.slice(-5),
      'RT:',
      payload.refreshToken.slice(-5),
      'expiresIn:',
      expiresIn,
    );
    return EMPTY_SESSION;
  }

  // Refresh if expired OR within threshold (proactive refresh)
  const needsRefresh = isExpired || expiresIn <= SESSION_REFRESH_THRESHOLD;

  console.log(
    `[auth] [${options.context}] verifySession, AT:`,
    payload.accessToken.slice(-5),
    'RT:',
    payload.refreshToken.slice(-5),
    'needsRefresh:',
    needsRefresh,
    'expiresIn:',
    expiresIn,
  );

  let accessToken = payload.accessToken;
  let refreshToken = payload.refreshToken;
  let expiresAt = payload.expiresAt;

  if (needsRefresh) {
    const refreshed = await client.refresh(payload.refreshToken);

    if (refreshed.err || !refreshed.tokens) {
      console.log(
        `[auth] [${options.context}] refresh failed, RT:`,
        payload.refreshToken.slice(-5),
        refreshed.err ?? 'no tokens returned',
      );
      cookieJar.delete();
      return EMPTY_SESSION;
    }

    console.log(
      `[auth] [${options.context}] tokens refreshed, old AT:`,
      payload.accessToken.slice(-5),
      'new AT:',
      refreshed.tokens.access.slice(-5),
      'RT:',
      payload.refreshToken.slice(-5),
      '→',
      refreshed.tokens.refresh.slice(-5),
    );

    accessToken = refreshed.tokens.access;
    refreshToken = refreshed.tokens.refresh;
    expiresAt = Math.floor(Date.now() / 1000) + AUTH_TTL.access;

    // Persist refreshed tokens (no-op for RSC since cookieJar.set is a no-op)
    const encrypted = await encryptToken({
      accessToken,
      expiresAt,
      refreshToken,
    });
    cookieJar.set(encrypted);
  } else {
    const verified = await client.verify(subjects, payload.accessToken);

    if (verified.err) {
      console.log(`[auth] [${options.context}] verify failed:`, verified.err);
      cookieJar.delete();
      return EMPTY_SESSION;
    }
  }

  const user = await fetchUser(accessToken);
  if (!user) {
    console.log(`[auth] [${options.context}] fetchUser failed`);
    cookieJar.delete();
    return EMPTY_SESSION;
  }

  return {
    accessToken,
    expiresAt,
    user,
  };
}

async function authRSC(): Promise<Session | EmptySession> {
  const cookieStore = await cookies();
  return verifySession(
    {
      delete: () => {}, // No-op in RSC
      get: () => cookieStore.get(SESSION_COOKIE_NAME)?.value,
      set: () => {}, // No-op in RSC
    },
    { context: 'RSC', readOnly: true },
  );
}

async function authRouteHandler(
  req: NextRequest,
): Promise<Session | EmptySession> {
  const cookieStore = await cookies();
  return verifySession(
    {
      delete: () => cookieStore.delete(SESSION_COOKIE_NAME),
      get: () => req.cookies.get(SESSION_COOKIE_NAME)?.value,
      set: (value) =>
        cookieStore.set(SESSION_COOKIE_NAME, value, SESSION_COOKIE_OPTIONS),
    },
    { context: 'RouteHandler' },
  );
}

// Overloaded auth function
export function auth(): Promise<Session | EmptySession>;
export function auth(req: NextRequest): Promise<Session | EmptySession>;
export function auth(req?: NextRequest): Promise<Session | EmptySession> {
  if (req) {
    return authRouteHandler(req);
  }
  return cachedAuth();
}

const cachedAuth = cache(authRSC);

export default auth;
