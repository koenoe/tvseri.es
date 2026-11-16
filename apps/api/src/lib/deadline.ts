import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Two points (epoch ms) in a request's life, set per request by the
 * `retryDeadline` middleware for reads; absent elsewhere (writes, queues,
 * crons):
 * - `retryBy`: after it, no optional work starts, such as a retry of an
 *   external call;
 * - `startBy`: after it, no external call starts at all: one waiting for a
 *   budget slot (lib/upstream/budget.ts) fails as "unavailable" instead, so
 *   the read answers (stale, partial or 503) before the Lambda times out.
 */
type Deadlines = Readonly<{
  retryBy: number;
  startBy: number;
  startedAt: number;
}>;

const deadlineContext = new AsyncLocalStorage<Deadlines>();

/**
 * Runs `fn` with a retry deadline `ms` from now, and a start deadline
 * `startMs` from now (none by default)
 */
export const runWithDeadline = <T>(
  ms: number,
  fn: () => T,
  startMs = Number.POSITIVE_INFINITY,
): T =>
  deadlineContext.run(
    {
      retryBy: Date.now() + ms,
      startBy: Date.now() + startMs,
      startedAt: Date.now(),
    },
    fn,
  );

/** Milliseconds left before the current retry deadline; Infinity without one */
export const remainingMs = (): number => {
  const deadlines = deadlineContext.getStore();
  return deadlines === undefined
    ? Number.POSITIVE_INFINITY
    : deadlines.retryBy - Date.now();
};

/** The epoch ms after which no external call may start; Infinity without one */
export const startDeadline = (): number =>
  deadlineContext.getStore()?.startBy ?? Number.POSITIVE_INFINITY;

/**
 * What a build needs left to start one more optional attempt (another
 * Connected by pair, another fall-through kind): one TMDB round with a slow
 * attempt. Below it the build stops and answers with what it has.
 */
const ANOTHER_ATTEMPT_MS = 2000;

/** Whether there's time to start another optional attempt */
export const hasTimeForAnother = (): boolean =>
  remainingMs() >= ANOTHER_ATTEMPT_MS;

/**
 * How much of a request's life all its waits on refreshes of data it already
 * has may take together (series facts, runtimes, tickets' seasons and
 * providers): they run side by side and one after another in one read, so
 * each wait gets what is left of this, not a budget of its own.
 */
const REFRESH_WAIT_MS = 300;

/** What is left of the request's refresh wait (all of it outside a request) */
export const refreshWaitMs = (): number => {
  const startedAt = deadlineContext.getStore()?.startedAt;
  return startedAt === undefined
    ? REFRESH_WAIT_MS
    : Math.max(0, REFRESH_WAIT_MS - (Date.now() - startedAt));
};
