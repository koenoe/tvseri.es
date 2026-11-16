import { claim, readClaim } from '@/lib/db/cache/singleFlight';
import { logWarn } from '@/utils/logWarn';

import { UpstreamUnavailableError } from './errors';

/**
 * A circuit breaker per external service (TMDB, MDBList, OMDb), kept per
 * Lambda instance and shared across instances through one Cache-table item.
 *
 * - **Opens** on a 429 at once, for `Retry-After` (at least MIN_OPEN_MS, at
 *   most MAX_OPEN_MS; TMDB's current 429 may carry none), or after
 *   FAILURES_TO_OPEN 5xx/timeouts/network errors within FAILURE_WINDOW_MS.
 *   An open that follows a failed probe waits twice as long as the last one
 *   (10 s, 20 s, 40 s... up to 5 minutes), so a long outage is asked once
 *   per few minutes per instance, not every few seconds.
 * - **While open**, `enter()` throws UpstreamUnavailableError at once: no
 *   call, no wait, no Lambda held.
 * - **Half-open**: once the open period has passed, exactly one call per
 *   instance goes through as a probe; the others still fail fast until it
 *   answers. Any answer that is not an overload (a 200, a 404) closes it.
 * - **Shared**: opening writes `claim:breaker:v1:<source>` with its
 *   `openUntil`, conditionally (only when no live one exists), so a burst
 *   of 429s writes at most once per instance per opening and usually once
 *   overall. Instances read that item at most every SHARED_REFRESH_MS, so
 *   the breaker costs one eventually consistent read per instance per 2 s
 *   of traffic, not one per TMDB call. Closing writes nothing: the item
 *   lapses with the open period and every instance probes for itself.
 *   A DynamoDB failure never fails a call: the breaker then works per
 *   instance only.
 */

/** The shortest open period: TMDB's limiter window is about a second */
export const MIN_OPEN_MS = 10_000;
/** The longest, whatever Retry-After says */
const MAX_OPEN_MS = 5 * 60_000;
const FAILURES_TO_OPEN = 5;
/** ...and at least this share of the window's calls failed */
const FAILURE_SHARE_TO_OPEN = 0.5;
const FAILURE_WINDOW_MS = 10_000;
/** How long an instance trusts its last read of the shared state */
export const SHARED_REFRESH_MS = 2000;

/** How a call went, as far as the breaker cares */
export type Verdict =
  /** An answer, also a 404 or another 4xx: the service is up */
  | Readonly<{ kind: 'ok' }>
  /** A 429 (or another overload answer with Retry-After) */
  | Readonly<{ kind: 'rate-limited'; retryAfterMs?: number }>
  /** A 5xx, a timeout or a network error */
  | Readonly<{ kind: 'failed' }>
  /** No call was made after all (no budget slot in time): no verdict */
  | Readonly<{ kind: 'skipped' }>;

export type Ticket = Readonly<{
  /** Reports the call's outcome; resolves once a shared open is written */
  report: (verdict: Verdict) => Promise<void>;
}>;

export type Breaker = Readonly<{
  /** Throws UpstreamUnavailableError while open; else a ticket to report on */
  enter: () => Promise<Ticket>;
  /** Opens until `until` (epoch ms) without a call (OMDb's daily limit) */
  openUntil: (until: number, reason: string) => Promise<void>;
  /** Whether it is open now (reads the shared state at most every 2 s) */
  isOpen: () => Promise<boolean>;
  /** Back to closed, forgetting everything (tests) */
  reset: () => void;
}>;

type State =
  | Readonly<{ kind: 'closed' }>
  | Readonly<{ kind: 'open'; until: number }>
  | Readonly<{ kind: 'half-open'; probing: boolean }>;

type SharedOpen = Readonly<{ openUntil: number }>;

const CLOSED: State = { kind: 'closed' };

const sharedKey = (source: string) => `breaker:v1:${source}`;

/**
 * `Retry-After` in ms: delay-seconds or an HTTP-date (RFC 9110 §10.2.3);
 * undefined when absent or unreadable.
 */
export const parseRetryAfter = (
  header: string | null | undefined,
  now = Date.now(),
): number | undefined => {
  if (!header) {
    return undefined;
  }
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }
  const date = Date.parse(trimmed);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
};

const clamp = (value: number) =>
  Math.min(MAX_OPEN_MS, Math.max(MIN_OPEN_MS, value));

export const createBreaker = (source: string): Breaker => {
  let state: State = CLOSED;
  let consecutiveOpens = 0;
  /** The window's calls: when, and whether they failed */
  let recent: Array<Readonly<{ at: number; failed: boolean }>> = [];

  let sharedUntil = 0;
  let sharedReadAt = Number.NEGATIVE_INFINITY;
  let sharedRead: Promise<void> | undefined;

  const unavailable = (ms: number, reason: string) =>
    new UpstreamUnavailableError(source, ms / 1000, reason);

  const refreshShared = async () => {
    if (Date.now() - sharedReadAt < SHARED_REFRESH_MS) {
      return;
    }
    sharedRead ??= readClaim<SharedOpen>(sharedKey(source))
      .then((shared) => {
        sharedUntil = Math.max(sharedUntil, shared?.openUntil ?? 0);
      })
      .catch((error: unknown) => {
        logWarn(`Breaker ${source}: shared state unreadable`, error);
      })
      .finally(() => {
        sharedReadAt = Date.now();
        sharedRead = undefined;
      });
    await sharedRead;
  };

  const writeShared = async (until: number) => {
    if (sharedUntil >= until - 1000) {
      return;
    }
    try {
      await claim(sharedKey(source), (until - Date.now()) / 1000, {
        openUntil: until,
      } satisfies SharedOpen);
    } catch (error) {
      logWarn(`Breaker ${source}: shared state unwritable`, error);
    }
    sharedUntil = Math.max(sharedUntil, until);
    sharedReadAt = Date.now();
  };

  const open = async (ms: number, reason: string) => {
    const until = Date.now() + ms;
    state = { kind: 'open', until };
    recent = [];
    logWarn(`Breaker ${source}: open for ${Math.round(ms / 1000)} s`, reason);
    await writeShared(until);
  };

  /** The next open period: Retry-After, else doubling after failed probes */
  const backoff = (retryAfterMs?: number) => {
    consecutiveOpens++;
    return clamp(
      Math.max(retryAfterMs ?? 0, MIN_OPEN_MS * 2 ** (consecutiveOpens - 1)),
    );
  };

  const remember = (failed: boolean) => {
    const now = Date.now();
    recent = [
      ...recent.filter((call) => now - call.at < FAILURE_WINDOW_MS),
      { at: now, failed },
    ];
  };

  const ticket = (probe: boolean): Ticket => ({
    report: async (verdict) => {
      if (verdict.kind === 'skipped') {
        if (probe && state.kind === 'half-open') {
          state = { kind: 'half-open', probing: false };
        }
        return;
      }
      if (verdict.kind === 'ok') {
        if (probe) {
          state = CLOSED;
          consecutiveOpens = 0;
          recent = [];
        } else if (state.kind === 'closed') {
          remember(false);
        }
        return;
      }
      // A call that started before the breaker opened adds nothing
      if (state.kind === 'open') {
        return;
      }
      if (verdict.kind === 'rate-limited') {
        await open(backoff(verdict.retryAfterMs), 'rate limited');
        return;
      }
      if (probe) {
        await open(backoff(), 'probe failed');
        return;
      }
      remember(true);
      const failed = recent.filter((call) => call.failed).length;
      if (
        failed >= FAILURES_TO_OPEN &&
        failed >= recent.length * FAILURE_SHARE_TO_OPEN
      ) {
        await open(backoff(), `${failed} of ${recent.length} calls failed`);
      }
    },
  });

  const enter = async () => {
    await refreshShared();
    const now = Date.now();
    if (
      sharedUntil > now &&
      !(state.kind === 'open' && state.until >= sharedUntil)
    ) {
      // Another instance opened it: follow, without a write of our own
      state = { kind: 'open', until: sharedUntil };
    }
    if (state.kind === 'open') {
      if (state.until > now) {
        throw unavailable(state.until - now, 'circuit open');
      }
      state = { kind: 'half-open', probing: false };
    }
    if (state.kind === 'half-open') {
      if (state.probing) {
        throw unavailable(1000, 'a probe is in flight');
      }
      state = { kind: 'half-open', probing: true };
      return ticket(true);
    }
    return ticket(false);
  };

  return {
    enter,
    isOpen: async () => {
      await refreshShared();
      const now = Date.now();
      return sharedUntil > now || (state.kind === 'open' && state.until > now);
    },
    openUntil: async (until, reason) => {
      if (state.kind === 'open' && state.until >= until) {
        return;
      }
      state = { kind: 'open', until };
      logWarn(
        `Breaker ${source}: open until ${new Date(until).toISOString()}`,
        reason,
      );
      await writeShared(until);
    },
    reset: () => {
      state = CLOSED;
      consecutiveOpens = 0;
      recent = [];
      sharedUntil = 0;
      sharedReadAt = Number.NEGATIVE_INFINITY;
      sharedRead = undefined;
    },
  };
};

const breakers = new Map<string, Breaker>();

/** This instance's breaker for `source` (one per external service) */
export const breakerFor = (source: string): Breaker => {
  let breaker = breakers.get(source);
  if (!breaker) {
    breaker = createBreaker(source);
    breakers.set(source, breaker);
  }
  return breaker;
};

/** Closes every breaker and forgets its state (tests: each starts closed) */
export const resetBreakers = () => {
  for (const breaker of breakers.values()) {
    breaker.reset();
  }
};
