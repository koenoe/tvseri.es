import type { BetterFetchOption } from '@better-fetch/fetch';
import { createFetch } from '@better-fetch/fetch';
import { sleep } from '@tvseri.es/utils';

import {
  MIN_RETRY_BUDGET,
  UPSTREAM_ATTEMPT_TIMEOUT,
  UPSTREAM_RETRY_DELAY,
} from '@/constants';
import { remainingMs } from '@/lib/deadline';
import {
  type Breaker,
  MIN_OPEN_MS,
  parseRetryAfter,
  type Verdict,
} from '@/lib/upstream/breaker';
import type { Budget } from '@/lib/upstream/budget';
import { UpstreamUnavailableError } from '@/lib/upstream/errors';

import { addDependencyMetric } from './context';

type FetchOptions = Omit<
  Parameters<typeof createFetch>[0],
  'retry' | 'timeout'
>;

/**
 * How a client treats one call. `retries: 1` retries once after a timeout, a
 * network error or a 5xx; never after a 404 or another 4xx (the same answer
 * would come back) and never after a 429: that opens the `breaker`, and the
 * call throws UpstreamUnavailableError. The retry only starts while the
 * request's deadline leaves `MIN_RETRY_BUDGET` (see READ_RETRY_DEADLINE),
 * and waits no longer than what is left. With a `breaker`, every attempt
 * asks it first (and fails fast while it is open); with a `budget`, every
 * attempt waits for one of the instance's slots for this service.
 */
type UpstreamPolicy = Readonly<{
  /** Per attempt, ms (default UPSTREAM_ATTEMPT_TIMEOUT) */
  attemptTimeout?: number;
  breaker?: Breaker;
  budget?: Budget;
  retries: 0 | 1;
}>;

type UpstreamError = Readonly<{ status: number; statusText?: string }>;

type Result<T> = Readonly<{ data: T | null; error: UpstreamError | null }>;

const isRetryableStatus = (status: number) => status >= 500;

const verdictOf = (status: number, retryAfterMs?: number): Verdict =>
  status === 429
    ? { kind: 'rate-limited', retryAfterMs }
    : status >= 500
      ? { kind: 'failed' }
      : { kind: 'ok' };

/**
 * An abort signal that fires after `ms`, built on setTimeout (so tests can
 * drive it with fake timers), merged with the caller's own signal.
 */
const attemptSignal = (ms: number, signal?: AbortSignal | null) => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    const error = new Error(`The operation timed out after ${ms} ms`);
    error.name = 'TimeoutError';
    controller.abort(error);
  }, ms);
  return {
    clear: () => clearTimeout(timer),
    signal: signal
      ? AbortSignal.any([controller.signal, signal])
      : controller.signal,
  };
};

/**
 * Creates a fetch client for an external service that times out each attempt,
 * retries per `policy` and tracks every attempt's duration and status for the
 * metrics. Returns `{ data, error }` like better-fetch; a timeout or network
 * error on the last attempt throws.
 *
 * @param source - Identifier for this data source (e.g., 'tmdb', 'mdblist')
 * @param options - Options passed to createFetch (no `retry`/`timeout`: the policy owns them)
 */
export const createInstrumentedFetch = (
  source: string,
  options: FetchOptions,
  policy: UpstreamPolicy,
) => {
  const baseFetch = createFetch(options);
  const attemptTimeout = policy.attemptTimeout ?? UPSTREAM_ATTEMPT_TIMEOUT;

  const attempt = async <T>(
    path: string,
    fetchOptions: BetterFetchOption | undefined,
    timeout: number,
  ) => {
    const start = performance.now();
    const timestamp = new Date().toISOString();
    const { clear, signal } = attemptSignal(timeout, fetchOptions?.signal);

    let status = 200;
    let error: string | undefined;
    let retryAfter: string | null = null;

    try {
      const result = await baseFetch<T>(path, {
        ...fetchOptions,
        onResponse: (context) => {
          retryAfter = context.response.headers.get('retry-after');
          return fetchOptions?.onResponse?.(context);
        },
        signal,
      });

      if (result.error) {
        status = result.error.status ?? 500;
        error = `HTTP ${status}`;
      }

      return {
        result: result as Result<T>,
        retryAfterMs: parseRetryAfter(retryAfter),
      };
    } catch (e) {
      status = 0;
      // An aborted attempt rejects with the signal's reason (our TimeoutError)
      error = e instanceof Error ? e.message : 'Unknown error';
      throw e;
    } finally {
      clear();
      const duration = Math.round(performance.now() - start);

      // Separate path and query params
      const [endpoint, queryString] = path.split('?');
      const params = queryString
        ? Object.fromEntries(new URLSearchParams(queryString))
        : null;

      addDependencyMetric({
        duration,
        endpoint: endpoint ?? path,
        error,
        params,
        source,
        status,
        timestamp,
      });
    }
  };

  /** The delay before a retry, or undefined when none may start */
  const retryDelay = (tried: number) =>
    tried <= policy.retries &&
    remainingMs() - UPSTREAM_RETRY_DELAY >= MIN_RETRY_BUDGET
      ? UPSTREAM_RETRY_DELAY
      : undefined;

  /**
   * One attempt behind the breaker and the budget: throws
   * UpstreamUnavailableError when either says no, or on a 429
   */
  const guarded = async <T>(
    path: string,
    fetchOptions: BetterFetchOption | undefined,
    timeout: number,
  ): Promise<Result<T>> => {
    const ticket = await policy.breaker?.enter();
    let release: (() => void) | undefined;
    try {
      release = await policy.budget?.acquire();
    } catch (error) {
      await ticket?.report({ kind: 'skipped' });
      throw error;
    }
    try {
      const { result, retryAfterMs } = await attempt<T>(
        path,
        fetchOptions,
        timeout,
      );
      const status = result.error?.status ?? 200;
      await ticket?.report(verdictOf(status, retryAfterMs));
      if (status === 429) {
        throw new UpstreamUnavailableError(
          source,
          (retryAfterMs ?? MIN_OPEN_MS) / 1000,
          'rate limited (429)',
        );
      }
      return result;
    } catch (error) {
      if (!(error instanceof UpstreamUnavailableError)) {
        await ticket?.report({ kind: 'failed' });
      }
      throw error;
    } finally {
      release?.();
    }
  };

  return async <T>(
    path: string,
    fetchOptions?: BetterFetchOption,
  ): Promise<Result<T>> => {
    for (let tried = 1; ; tried++) {
      // A retry waits no longer than the deadline leaves; a first attempt
      // always gets its full time (it may still fill the caches)
      const timeout =
        tried === 1
          ? attemptTimeout
          : Math.min(attemptTimeout, Math.max(remainingMs(), 0));

      try {
        const result = await guarded<T>(path, fetchOptions, timeout);
        if (!result.error || !isRetryableStatus(result.error.status)) {
          return result;
        }
        const delay = retryDelay(tried);
        if (delay === undefined) {
          return result;
        }
        await sleep(delay);
      } catch (error) {
        const delay = retryDelay(tried);
        // An open breaker, no budget slot or a 429: never retried
        if (delay === undefined || error instanceof UpstreamUnavailableError) {
          throw error;
        }
        await sleep(delay);
      }
    }
  };
};
