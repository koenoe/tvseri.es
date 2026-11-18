import { AsyncLocalStorage } from 'node:async_hooks';

import { startDeadline } from '@/lib/deadline';

import { UpstreamUnavailableError } from './errors';

/**
 * How much of an external service one Lambda instance may use: calls in
 * flight and calls started per second. One table per kind of Lambda, so the
 * numbers live here and nowhere else.
 *
 * TMDB documents "somewhere in the 40 requests per second range", per IP
 * (https://developer.themoviedb.org/docs/rate-limiting; staff on the forum:
 * per IP, ~20 connections), and how Lambda instances map to egress IPs is
 * not documented. So one instance stays well inside one IP's share on its
 * own: 15 a second leaves room for a second busy instance on the same IP
 * (2 × 15 = 30 < 40), and 8 in flight stays under the 20 connections. At
 * TMDB's usual 150-250 ms, 8 in flight sustain 30-50 calls a second, so the
 * rate, not the concurrency, is what binds. Background Lambdas (the watched
 * stream, the Plex queue, the nightly job) are never waited on by a person:
 * 4 in flight and 5 a second, so up to 10 of them together stay near
 * TMDB's limit instead of 20 × 10 in flight.
 */
export type BudgetConfig = Readonly<{
  /** Calls in flight at once */
  concurrency: number;
  /** Calls started in any 1-second window */
  perSecond: number;
}>;

export type LambdaKind = 'api' | 'background';

export const UPSTREAM_BUDGETS: Readonly<
  Record<LambdaKind, Readonly<Record<'tmdb', BudgetConfig>>>
> = {
  api: { tmdb: { concurrency: 8, perSecond: 15 } },
  background: { tmdb: { concurrency: 4, perSecond: 5 } },
};

/**
 * How wide one fan-out runs (fan-outs side by side share the budget, so
 * this only keeps one from queueing far more than the budget lets through)
 */
export const TMDB_CONCURRENCY = UPSTREAM_BUDGETS.api.tmdb.concurrency;

// Every Lambda but the API is background work; the API's app.ts says so
let kind: LambdaKind = 'background';
let override: Partial<BudgetConfig> | undefined;

/** Which table this Lambda uses (the API calls it once, at module load) */
export const setLambdaKind = (next: LambdaKind) => {
  kind = next;
};

/** Tests only: replace parts of the budget (e.g. no rate limit) */
export const overrideBudget = (next: Partial<BudgetConfig> | undefined) => {
  override = next;
};

const configOf = (source: 'tmdb'): BudgetConfig => ({
  ...UPSTREAM_BUDGETS[kind][source],
  ...override,
});

/**
 * Calls made inside `atLowPriority` wait behind every other waiting call and
 * use at most half the budget (in flight and per second): refreshes of data
 * a read already has must never delay the data it lacks.
 */
const priorityContext = new AsyncLocalStorage<'low'>();

export const atLowPriority = <T>(fn: () => T): T =>
  priorityContext.run('low', fn);

type Waiter = Readonly<{
  deadline: number;
  low: boolean;
  reject: (error: Error) => void;
  resolve: (release: () => void) => void;
}>;

export type Budget = Readonly<{
  /**
   * Waits for a slot (FIFO) and resolves with its release. Rejects with
   * UpstreamUnavailableError when the request can no longer start a call in
   * time (see `startDeadline`): a read then answers with stale data or
   * "unavailable" instead of running into the Lambda's timeout.
   */
  acquire: () => Promise<() => void>;
  /** Forgets the calls in flight and waiting (tests) */
  reset: () => void;
}>;

export const createBudget = (
  source: 'tmdb',
  config: () => BudgetConfig = () => configOf(source),
): Budget => {
  let active = 0;
  let starts: number[] = [];
  let queue: Waiter[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = (at: number) => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    // No deadline (writes, queues): only a release or a rate slot pumps
    if (!Number.isFinite(at)) {
      return;
    }
    timer = setTimeout(
      () => {
        timer = undefined;
        pump();
      },
      Math.max(0, at - Date.now()),
    );
  };

  const pump = () => {
    const { concurrency, perSecond } = config();
    for (;;) {
      const now = Date.now();
      const late = queue.filter((waiter) => waiter.deadline <= now);
      if (late.length > 0) {
        queue = queue.filter((waiter) => waiter.deadline > now);
        for (const waiter of late) {
          waiter.reject(
            new UpstreamUnavailableError(source, 1, 'no budget slot in time'),
          );
        }
      }
      const next = queue.find((waiter) => !waiter.low) ?? queue[0];
      if (!next) {
        return;
      }
      // Low-priority calls only ever use half the budget: the other half
      // stays free for calls a reader waits on
      const share = next.low ? 0.5 : 1;
      if (active >= Math.max(1, Math.floor(concurrency * share))) {
        // A release pumps again; still drop waiters at their deadline
        schedule(Math.min(...queue.map((waiter) => waiter.deadline)));
        return;
      }
      starts = starts.filter((at) => now - at < 1000);
      if (starts.length >= Math.max(1, Math.floor(perSecond * share))) {
        const slot = (starts[0] ?? now) + 1000;
        schedule(Math.min(slot, ...queue.map((waiter) => waiter.deadline)));
        return;
      }
      queue = queue.filter((waiter) => waiter !== next);
      active++;
      starts.push(now);
      let released = false;
      next.resolve(() => {
        if (!released) {
          released = true;
          active = Math.max(0, active - 1);
          pump();
        }
      });
    }
  };

  return {
    acquire: () =>
      new Promise<() => void>((resolve, reject) => {
        queue.push({
          deadline: startDeadline(),
          low: priorityContext.getStore() === 'low',
          reject,
          resolve,
        });
        pump();
      }),
    reset: () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      active = 0;
      starts = [];
      queue = [];
    },
  };
};

const budgets = new Map<'tmdb', Budget>();

/** This instance's budget for `source` (TMDB only: the others are cheap) */
export const budgetFor = (source: 'tmdb'): Budget => {
  let budget = budgets.get(source);
  if (!budget) {
    budget = createBudget(source);
    budgets.set(source, budget);
  }
  return budget;
};

/** Forgets every budget's calls in flight and waiting (tests) */
export const resetBudgets = () => {
  for (const budget of budgets.values()) {
    budget.reset();
  }
};
