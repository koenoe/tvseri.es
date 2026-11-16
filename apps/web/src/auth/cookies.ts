/**
 * Cookie names and options. The names and options are what browsers hold
 * today: changing one logs everybody out. No `server-only`: the header reads
 * the display cookie on the client.
 */

export const SESSION_COOKIE_NAME = '__tvseries_session';
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};

/**
 * Display-only copy of the logged-in username, so the header can be rendered
 * on the client and cached pages need no per-request render for it. It is NOT
 * HttpOnly and NOT trusted: no server code may use it for anything but
 * display; authorisation always goes through the session cookie. It is
 * written and deleted together with the session cookie (`auth/sessionCookies.ts`,
 * `proxy.ts`).
 */
export const USER_DISPLAY_COOKIE_NAME = '__tvseries_user';
export const USER_DISPLAY_COOKIE_OPTIONS = {
  ...SESSION_COOKIE_OPTIONS,
  httpOnly: false,
};

/**
 * Set by the auth callback when a sign-in created the account; the site's
 * welcome toast (`components/WelcomeToast.tsx`) reads and deletes it, so the
 * toast shows once, on the page the sign-in returns to. Not HttpOnly (the
 * client deletes it), short-lived, and only ever means “say welcome”.
 */
export const WELCOME_COOKIE_NAME = '__tvseries_welcome';
export const WELCOME_COOKIE_OPTIONS = {
  httpOnly: false,
  maxAge: 60 * 10, // 10 minutes: long enough for a slow first page
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};
