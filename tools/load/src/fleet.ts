import { vi } from 'vitest';

import type { OriginAnswer } from './cdn';

/**
 * Simulated API Lambda instances. Each one is a fresh import of the Hono app
 * (`vi.resetModules()` first), so it has its own module state, as a real
 * execution environment does: its own TMDB limiter and budget, breaker
 * memory, in-flight dedupe and in-memory caches. They share the DynamoDB
 * double (setup.ts) and the fake upstream.
 *
 * Like Lambda, an instance serves one request at a time; a request that
 * finds every instance busy is throttled (Lambda's reserved-concurrency 429,
 * which CloudFront turns into an error for the browser).
 */

type HonoApp = Readonly<{
  request: (path: string, init?: RequestInit) => Response | Promise<Response>;
}>;

type Instance = { app: HonoApp; busy: boolean };

type BudgetModule = Readonly<{
  overrideBudget: (
    next: Readonly<{ concurrency?: number; perSecond?: number }> | undefined,
  ) => void;
}>;

export type FleetStats = Readonly<{
  peakBusy: number;
  served: number;
  throttled: number;
}>;

export const createFleet = async (size: number) => {
  const instances: Instance[] = [];
  const overrides: BudgetModule['overrideBudget'][] = [];
  for (let index = 0; index < size; index++) {
    vi.resetModules();
    const module = (await import('@/app')) as Readonly<{ default: HonoApp }>;
    instances.push({ app: module.default, busy: false });
    // The same instance's TMDB budget, where the code has one (older code
    // has none): lifted while warming, so every run warms the same caches
    const budget = (await import('@/lib/upstream/budget').catch(
      () => undefined,
    )) as BudgetModule | undefined;
    if (budget) {
      overrides.push(budget.overrideBudget);
    }
  }

  // While warming caches, a request with no free instance shares one
  // (a warm-up shortcut: never during a measured run)
  let shareWhenBusy = false;
  let busy = 0;
  let peakBusy = 0;
  let served = 0;
  let throttled = 0;

  const handle = async (
    path: string,
    init: RequestInit,
  ): Promise<OriginAnswer> => {
    const instance =
      instances.find((candidate) => !candidate.busy) ??
      (shareWhenBusy ? instances[served % instances.length] : undefined);
    if (!instance) {
      throttled++;
      return { body: '', cacheControl: 'no-store', status: 429 };
    }
    instance.busy = true;
    busy++;
    peakBusy = Math.max(peakBusy, busy);
    try {
      const response = await instance.app.request(path, init);
      served++;
      return {
        body: await response.text(),
        cacheControl: response.headers.get('cache-control') ?? '',
        status: response.status,
      };
    } catch {
      return { body: '', cacheControl: 'no-store', status: 502 };
    } finally {
      instance.busy = false;
      busy--;
    }
  };

  const stats = (): FleetStats => ({ peakBusy, served, throttled });
  const resetStats = () => {
    peakBusy = busy;
    served = 0;
    throttled = 0;
  };

  const warming = (on: boolean) => {
    shareWhenBusy = on;
    for (const override of overrides) {
      override(
        on
          ? { concurrency: 1000, perSecond: Number.POSITIVE_INFINITY }
          : undefined,
      );
    }
  };

  return { handle, resetStats, stats, warming };
};
