import { cookies } from 'next/headers';
import { client } from './client';

export const LOGIN_CALLBACK_PATH = '/api/auth/callback';

// Renders the login prompt; the proxy rewrites protected pages to it for
// logged-out visitors (see app/login/page.tsx).
export const LOGIN_REQUIRED_PATH = '/login';

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
  state: string;
  verifier: string;
}>;

const DUMMY_ORIGIN = 'http://localhost';

/**
 * Returns `value` when it is a same-origin relative path, otherwise '/'.
 * Resolving it with the URL parser (which, like browsers, ignores tabs and
 * newlines and treats `\` as `/`) catches `//evil.com`, `/\evil.com` and
 * similar open-redirect tricks.
 */
export function toSafeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return '/';
  }

  try {
    const url = new URL(value, DUMMY_ORIGIN);
    if (
      url.origin !== DUMMY_ORIGIN ||
      // A normalised `/./\/evil.com` is `//evil.com`, which is protocol-relative.
      url.pathname.startsWith('//') ||
      // Returning to the login prompt itself would show it again after login.
      url.pathname === LOGIN_REQUIRED_PATH
    ) {
      return '/';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

/**
 * Starts the OAuth flow: returns the authorize URL and remembers the state,
 * PKCE verifier and return-to path in a cookie, so the callback only accepts a
 * code that belongs to a login this browser started (prevents login CSRF).
 */
export async function startLogin(
  origin: string,
  returnTo?: unknown,
): Promise<string> {
  const { challenge, url } = await client.authorize(
    `${origin}${LOGIN_CALLBACK_PATH}`,
    'code',
    { pkce: true },
  );

  const loginState: LoginState = {
    returnTo: toSafeReturnTo(returnTo),
    state: challenge.state,
    verifier: challenge.verifier ?? '',
  };

  const cookieStore = await cookies();
  cookieStore.set(
    LOGIN_COOKIE_NAME,
    JSON.stringify(loginState),
    LOGIN_COOKIE_OPTIONS,
  );

  return url;
}

function parseLoginState(value: string): Partial<LoginState> {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Reads and clears the login cookie. Returns the PKCE verifier and the
 * (validated) return-to path when `state` matches the login this browser
 * started, otherwise null.
 */
export async function consumeLogin(
  state: string | null,
): Promise<Readonly<{ returnTo: string; verifier: string }> | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOGIN_COOKIE_NAME)?.value;

  cookieStore.delete({ name: LOGIN_COOKIE_NAME, path: LOGIN_CALLBACK_PATH });

  if (!value || !state) {
    return null;
  }

  const login = parseLoginState(value);

  if (
    typeof login.state !== 'string' ||
    typeof login.verifier !== 'string' ||
    !login.verifier ||
    login.state !== state
  ) {
    return null;
  }

  return { returnTo: toSafeReturnTo(login.returnTo), verifier: login.verifier };
}
