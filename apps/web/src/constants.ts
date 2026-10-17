export const DEFAULT_BACKGROUND_COLOR = '#171717';
export const DEFAULT_BACKGROUND_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// 10 second timeout
export const FETCH_TIMEOUT = 10000;

// Session cookie configuration
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
 * written and deleted together with the session cookie (`auth/session.ts`,
 * `proxy.ts`).
 */
export const USER_DISPLAY_COOKIE_NAME = '__tvseries_user';
export const USER_DISPLAY_COOKIE_OPTIONS = {
  ...SESSION_COOKIE_OPTIONS,
  httpOnly: false,
};
export const SESSION_REFRESH_THRESHOLD = 60; // Refresh when less than 60 seconds remaining
