import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runWithDeadline } from '@/lib/deadline';
import {
  atLowPriority,
  type BudgetConfig,
  createBudget,
  UPSTREAM_BUDGETS,
} from '@/lib/upstream/budget';
import { UpstreamUnavailableError } from '@/lib/upstream/errors';

const budgetOf = (config: BudgetConfig) => createBudget('tmdb', () => config);

/** Starts `count` acquisitions; records when each one got its slot */
const startMany = (
  acquire: () => Promise<() => void>,
  count: number,
  hold = 0,
) => {
  const started: number[] = [];
  const done = Promise.allSettled(
    Array.from({ length: count }, async () => {
      const release = await acquire();
      started.push(Date.now());
      if (hold > 0) {
        await new Promise((resolve) => setTimeout(resolve, hold));
      }
      release();
    }),
  );
  return { done, started };
};

describe('the per-instance TMDB budget', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });

  it('starts at most 15 calls in any second on the API', async () => {
    const budget = budgetOf(UPSTREAM_BUDGETS.api.tmdb);
    const t0 = Date.now();
    const { done, started } = startMany(budget.acquire, 45, 100);

    await vi.advanceTimersByTimeAsync(5000);
    await done;

    expect(started).toHaveLength(45);
    for (const at of started) {
      const inWindow = started.filter(
        (other) => other >= at && other < at + 1000,
      ).length;
      expect(inWindow).toBeLessThanOrEqual(15);
    }
    // Three seconds' worth, not one burst
    expect(Math.max(...started) - t0).toBeGreaterThanOrEqual(2000);
  });

  it('keeps at most 8 in flight on the API, 4 in the background', async () => {
    for (const [config, max] of [
      [UPSTREAM_BUDGETS.api.tmdb, 8],
      [UPSTREAM_BUDGETS.background.tmdb, 4],
    ] as const) {
      const budget = budgetOf({ ...config, perSecond: 1000 });
      let open = 0;
      let peak = 0;
      const runs = Array.from({ length: 20 }, async () => {
        const release = await budget.acquire();
        open++;
        peak = Math.max(peak, open);
        await new Promise((resolve) => setTimeout(resolve, 200));
        open--;
        release();
      });
      await vi.advanceTimersByTimeAsync(2000);
      await Promise.all(runs);
      expect(peak).toBe(max);
    }
  });

  it('turns a wait past the request deadline into "unavailable"', async () => {
    const budget = budgetOf({ concurrency: 1, perSecond: 100 });
    const held = await budget.acquire();

    // A read that may still start calls for 9 s
    const waiting = runWithDeadline(1000, () => budget.acquire(), 9000);
    const outcome = waiting.then(
      () => 'got a slot',
      (error: unknown) =>
        error instanceof UpstreamUnavailableError ? 'unavailable' : 'error',
    );
    await vi.advanceTimersByTimeAsync(3000);
    held();
    expect(await outcome).toBe('got a slot');
    (await waiting)();

    // ...and one that may start calls for 2 s only
    const blocked = await budget.acquire();
    const late = runWithDeadline(1000, () => budget.acquire(), 2000).then(
      () => 'got a slot',
      (error: unknown) =>
        error instanceof UpstreamUnavailableError ? 'unavailable' : 'error',
    );
    await vi.advanceTimersByTimeAsync(2000);
    expect(await late).toBe('unavailable');
    blocked();
  });

  it('lets every other call go before low-priority ones (refreshes)', async () => {
    const budget = budgetOf({ concurrency: 1, perSecond: 100 });
    const held = await budget.acquire();
    const order: string[] = [];
    const take = (name: string) =>
      budget.acquire().then((release) => {
        order.push(name);
        release();
      });

    const waiting = [
      atLowPriority(() => take('refresh 1')),
      atLowPriority(() => take('refresh 2')),
      take('missing'),
    ];
    held();
    await Promise.all(waiting);

    expect(order).toEqual(['missing', 'refresh 1', 'refresh 2']);
  });

  it('keeps half the budget free of low-priority calls', async () => {
    const budget = budgetOf({ concurrency: 8, perSecond: 100 });
    const low = await Promise.all(
      Array.from({ length: 4 }, () => atLowPriority(() => budget.acquire())),
    );
    let fifthLow = false;
    void atLowPriority(() => budget.acquire()).then(() => {
      fifthLow = true;
    });
    const normal = await Promise.all(
      Array.from({ length: 4 }, () => budget.acquire()),
    );

    expect(normal).toHaveLength(4);
    expect(fifthLow).toBe(false);
    for (const release of [...low, ...normal]) release();
  });

  it('lets a write wait as long as it takes (no deadline)', async () => {
    const budget = budgetOf({ concurrency: 1, perSecond: 100 });
    const held = await budget.acquire();
    let got = false;
    void budget.acquire().then(() => {
      got = true;
    });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(got).toBe(false);
    held();
    await vi.advanceTimersByTimeAsync(0);
    expect(got).toBe(true);
  });
});
