import 'server-only';

import type { AuthNotice } from '@tvseri.es/constants';
import { cookies } from 'next/headers';

import { getAuthClient } from './client';
import { toSafeReturnTo } from './returnTo';

export const LOGIN_CALLBACK_PATH = '/api/auth/callback';

// Holds the OAuth `state`, PKCE verifier and return-to path between
// `startLogin` and the callback. Scoped to the callback path and short-lived.
const LOGIN_COOKIE_NAME = '__tvseries_login';
const LOGIN_COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 60 * 10, // 10 minutes
  path: LOGIN_CALLBACK_PATH,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};

type LoginState = Readonly<{
  returnTo: string;
  /** When the login started (epoch ms): tells a sign-in that created the account */
  startedAt: number;
  state: string;
  verifier: string;
}>;

/**
 * Starts the OAuth flow: returns the authorize URL and remembers the state,
 * PKCE verifier and return-to path in a cookie, so the callback only accepts a
 * code that belongs to a login this browser started (prevents login CSRF).
 * `origin` must be the configured site origin (`getBaseUrl()`): the auth
 * server only accepts its callback URL.
 */
export async function startLogin(
  origin: string,
  returnTo?: unknown,
  notice?: AuthNotice,
): Promise<string> {
  const { challenge, url } = await getAuthClient().authorize(
    `${origin}${LOGIN_CALLBACK_PATH}`,
    'code',
    { pkce: true },
  );

  const loginState: LoginState = {
    returnTo: toSafeReturnTo(returnTo),
    startedAt: Date.now(),
    state: challenge.state,
    verifier: challenge.verifier ?? '',
  };

  const cookieStore = await cookies();
  cookieStore.set(
    LOGIN_COOKIE_NAME,
    JSON.stringify(loginState),
    LOGIN_COOKIE_OPTIONS,
  );

  if (!notice) {
    return url;
  }
  // The sign-in page shows one allow-listed line for it (the issuer passes
  // unknown parameters through to its `select` page).
  const withNotice = new URL(url);
  withNotice.searchParams.set('notice', notice);
  return withNotice.toString();
}

function parseLoginState(value: string): Partial<LoginState> {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export type ConsumedLogin = Readonly<{
  /**
   * The login's (validated) return path, '/' without a login cookie. Also
   * when `state` doesn't match: an error answer carries no state, and a
   * restart or the error page keeps the path.
   */
  returnTo: string;
  /** The login this browser started, when `state` matches it; else null */
  verified: Readonly<{ startedAt: number | null; verifier: string }> | null;
}>;

/**
 * Reads and clears the login cookie: the return path, and the PKCE verifier
 * and start time when `state` matches the login this browser started.
 */
export async function consumeLogin(
  state: string | null,
): Promise<ConsumedLogin> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOGIN_COOKIE_NAME)?.value;

  cookieStore.delete({ name: LOGIN_COOKIE_NAME, path: LOGIN_CALLBACK_PATH });

  const login = value ? parseLoginState(value) : {};
  const returnTo = toSafeReturnTo(login.returnTo);

  if (
    !state ||
    typeof login.state !== 'string' ||
    typeof login.verifier !== 'string' ||
    !login.verifier ||
    login.state !== state
  ) {
    return { returnTo, verified: null };
  }

  const startedAt =
    typeof login.startedAt === 'number' ? login.startedAt : null;
  return { returnTo, verified: { startedAt, verifier: login.verifier } };
}
