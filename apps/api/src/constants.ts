/**
 * The API's calls to external services (TMDB, MDBList, OMDb, Wikidata): see
 * `lib/metrics/instrumented-fetch.ts` for the policy these feed.
 *
 * One attempt waits at most this long. TMDB answers in well under a second;
 * a call still open after 5 s is a stalled connection that a fresh attempt
 * usually gets through at once.
 */
export const UPSTREAM_ATTEMPT_TIMEOUT = 5000;

/**
 * The pause before the one retry of a timeout, network error or 5xx. A 429
 * is never retried: it opens the service's circuit breaker instead
 * (lib/upstream/breaker.ts), which honours Retry-After.
 */
export const UPSTREAM_RETRY_DELAY = 250;

/**
 * Reads (GET/HEAD) answer the web, which gives up after 10 s
 * (`apps/web/src/lib/constants.ts`). A retry only starts while it can still
 * finish before this point after the request began, so a retry never makes
 * an answer late. First attempts are never cut short: a cold read that takes
 * longer still fills the Cache table and the CDN for the next visit.
 */
export const READ_RETRY_DEADLINE = 8000;

/** A retry needs at least this much of the deadline left to start */
export const MIN_RETRY_BUDGET = 1000;

/**
 * No external call starts later than this after a read began: a call still
 * waiting for a budget slot then fails as "unavailable". A call started by
 * 9 s ends by 14 s (one 5 s attempt), Hono's request timeout, so a read
 * never runs into the Lambda's 15 s while queued behind its own fan-out.
 */
export const READ_START_DEADLINE = 9000;

// Worst case per call without a deadline (writes, queues, crons):
// 5 s + 0.25 s + 5 s ≈ 10 s, inside the 14 s request timeout and 15 s Lambda.

// A user is "active" if they watched anything (manual mark or Plex scrobble)
// within this window. The nightly watched-status job only re-checks active
// users; anyone else is re-checked once when they come back (middleware/auth.ts).
export const ACTIVE_USER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
