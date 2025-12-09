import type { RetryOptions } from '@better-fetch/fetch';

export const DEFAULT_BACKGROUND_COLOR = '#171717';
export const DEFAULT_BACKGROUND_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Fetch settings for internal API calls
// No retries - API already handles retries to external services
export const FETCH_RETRY_OPTIONS = {
  attempts: 1,
} as RetryOptions;

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
export const SESSION_REFRESH_THRESHOLD = 60; // Refresh when less than 60 seconds remaining
