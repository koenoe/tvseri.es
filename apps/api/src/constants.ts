import type { RetryOptions } from '@better-fetch/fetch';

// API calls external services (TMDB, MDBList)
// 2 attempts (1 retry) for transient failures
export const FETCH_RETRY_OPTIONS = {
  attempts: 2,
  baseDelay: 500,
  maxDelay: 2000,
  type: 'exponential',
} as RetryOptions;

// 6.5 second timeout per attempt
// Worst case: 6.5s + 0.5s delay + 6.5s = 13.5s (fits in 15s Lambda timeout)
export const FETCH_TIMEOUT = 6500;

// A user is "active" if they watched anything (manual mark or Plex scrobble)
// within this window. The nightly watched-status job only re-checks active
// users; anyone else is re-checked once when they come back (middleware/auth.ts).
export const ACTIVE_USER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
