import { createClient } from '@openauthjs/openauth/client';
import { subjects, type User } from '@tvseri.es/schemas';
import { CompactEncrypt, compactDecrypt } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { cache } from 'react';
import { Resource } from 'sst';
import { ACCESS_TOKEN_TTL, SESSION_REFRESH_THRESHOLD } from './constants';
import { me } from './lib/api';

// Session cookie configuration
const SESSION_COOKIE_NAME = '__tvseries_session';
const SESSION_COOKIE_NAME_OPTIONS = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365, // 1 year,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};

type SessionPayload = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

type Session = {
  accessToken: string;
  user: User;
  expiresAt: number;
};

const EMPTY_SESSION = {
  accessToken: null,
  expiresAt: null,
  user: null,
} as const;

type EmptySession = typeof EMPTY_SESSION;

export const client = createClient({
  clientID: 'website',
  issuer: Resource.Auth.url,
});

// Encryption key derived from secret
let encryptionKey: Uint8Array | null = null;
async function getEncryptionKey(): Promise<Uint8Array> {
  if (!encryptionKey) {
    const secret = Resource.SessionSecret.value;
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        hash: 'SHA-256',
        iterations: 100000,
        name: 'PBKDF2',
        salt: encoder.encode('tvseries-session'),
      },
      keyMaterial,
      256,
    );
    encryptionKey = new Uint8Array(bits);
  }
  return encryptionKey;
}

async function encryptSession(payload: SessionPayload): Promise<string> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const jwe = await new CompactEncrypt(encoder.encode(JSON.stringify(payload)))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(key);
  return jwe;
}

async function decryptSession(token: string): Promise<SessionPayload | null> {
  try {
    const key = await getEncryptionKey();
    const { plaintext } = await compactDecrypt(token, key);
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(plaintext)) as SessionPayload;
  } catch {
    return null;
  }
}

// Create a new session (for callback route)
export async function createSession(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  console.log('[auth] createSession, token:', accessToken.slice(-5));
  const cookieStore = await cookies();
  const expiresAt = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL;
  const encrypted = await encryptSession({
    accessToken,
    expiresAt,
    refreshToken,
  });
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, SESSION_COOKIE_NAME_OPTIONS);
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
  options: { proactiveRefresh: boolean; context: VerifyContext },
): Promise<Session | EmptySession> {
  const sessionCookie = cookieJar.get();

  if (!sessionCookie) {
    return EMPTY_SESSION;
  }

  const payload = await decryptSession(sessionCookie);
  if (!payload) {
    return EMPTY_SESSION;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.expiresAt - now;
  const isExpired = expiresIn <= 0;
  // Refresh if: expired OR (within threshold AND proactive refresh enabled)
  // RSC: only refresh if expired (can't persist, so no point refreshing early)
  // RouteHandler/Middleware: refresh proactively within threshold and persist
  const needsRefresh =
    isExpired ||
    (options.proactiveRefresh && expiresIn <= SESSION_REFRESH_THRESHOLD);

  console.log(
    `[auth] [${options.context}] verifySession, token:`,
    payload.accessToken.slice(-5),
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
        `[auth] [${options.context}] refresh failed:`,
        refreshed.err ?? 'no tokens returned',
      );
      cookieJar.delete();
      return EMPTY_SESSION;
    }

    console.log(
      `[auth] [${options.context}] tokens refreshed, old:`,
      payload.accessToken.slice(-5),
      'new:',
      refreshed.tokens.access.slice(-5),
    );

    accessToken = refreshed.tokens.access;
    refreshToken = refreshed.tokens.refresh;
    expiresAt = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL;

    // Persist refreshed tokens (no-op for RSC since cookieJar.set is a no-op)
    const encrypted = await encryptSession({
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

// RSC auth - verify only, no refresh
async function authRSC(): Promise<Session | EmptySession> {
  const cookieStore = await cookies();
  return verifySession(
    {
      delete: () => {}, // No-op in RSC
      get: () => cookieStore.get(SESSION_COOKIE_NAME)?.value,
      set: () => {}, // No-op in RSC
    },
    { context: 'RSC', proactiveRefresh: false },
  );
}

// Route Handler auth - can refresh tokens
async function authRouteHandler(
  req: NextRequest,
): Promise<Session | EmptySession> {
  const cookieStore = await cookies();
  return verifySession(
    {
      delete: () => cookieStore.delete(SESSION_COOKIE_NAME),
      get: () => req.cookies.get(SESSION_COOKIE_NAME)?.value,
      set: (value) =>
        cookieStore.set(
          SESSION_COOKIE_NAME,
          value,
          SESSION_COOKIE_NAME_OPTIONS,
        ),
    },
    { context: 'RouteHandler', proactiveRefresh: true },
  );
}

// Middleware auth - can refresh, writes to response cookies
async function authMiddleware(
  req: NextRequest,
  res: NextResponse,
): Promise<Session | EmptySession> {
  return verifySession(
    {
      delete: () => res.cookies.delete(SESSION_COOKIE_NAME),
      get: () => req.cookies.get(SESSION_COOKIE_NAME)?.value,
      set: (value) =>
        res.cookies.set(
          SESSION_COOKIE_NAME,
          value,
          SESSION_COOKIE_NAME_OPTIONS,
        ),
    },
    { context: 'Middleware', proactiveRefresh: true },
  );
}

// Overloaded auth function
export function auth(): Promise<Session | EmptySession>;
export function auth(req: NextRequest): Promise<Session | EmptySession>;
export function auth(
  req: NextRequest,
  res: NextResponse,
): Promise<Session | EmptySession>;
export function auth(
  req?: NextRequest,
  res?: NextResponse,
): Promise<Session | EmptySession> {
  if (res && req) {
    return authMiddleware(req, res);
  }
  if (req) {
    return authRouteHandler(req);
  }
  return cachedAuth();
}

const cachedAuth = cache(authRSC);

export default auth;
