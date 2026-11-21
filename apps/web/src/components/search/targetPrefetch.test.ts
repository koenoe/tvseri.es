import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTargetPrefetch, TARGET_SETTLE_MS } from './targetPrefetch';

/**
 * The marked result (what Enter opens) counts as intent once the marking
 * rests: one at a time, never for each result passed on the way.
 */
describe('createTargetPrefetch', () => {
  let prefetch: ReturnType<typeof vi.fn<(href: string) => void>>;
  let target: ReturnType<typeof createTargetPrefetch<string>>;

  beforeEach(() => {
    vi.useFakeTimers();
    prefetch = vi.fn();
    target = createTargetPrefetch<string>(prefetch);
  });
  afterEach(() => vi.useRealTimers());

  it('prefetches the marked result once it rests there for 100ms', () => {
    target.mark('/1396/breaking-bad');
    vi.advanceTimersByTime(TARGET_SETTLE_MS - 1);
    expect(prefetch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(prefetch).toHaveBeenCalledExactlyOnceWith('/1396/breaking-bad');
  });

  it('arrowing through results prefetches only where it stops', () => {
    target.mark('/1/a');
    vi.advanceTimersByTime(60);
    target.mark('/2/b');
    vi.advanceTimersByTime(60);
    target.mark('/3/c');
    vi.advanceTimersByTime(TARGET_SETTLE_MS);
    expect(prefetch.mock.calls).toEqual([['/3/c']]);
  });

  it('once a result opens, nothing more is prefetched (its own page is on the way)', () => {
    target.stop();
    target.mark('/1/a');
    vi.advanceTimersByTime(TARGET_SETTLE_MS);
    expect(prefetch).not.toHaveBeenCalled();
  });

  it('typing on or closing drops the one waiting', () => {
    target.mark('/1/a');
    target.cancel();
    vi.advanceTimersByTime(TARGET_SETTLE_MS);
    expect(prefetch).not.toHaveBeenCalled();
  });
});
