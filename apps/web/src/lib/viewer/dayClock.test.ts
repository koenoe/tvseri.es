import { afterEach, describe, expect, it, vi } from 'vitest';

import { localDay, startOfUtcDay, subscribeToMinute } from './dayClock';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('day clock', () => {
  it('names the local day as YYYY-MM-DD, zero-padded', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 23, 59));
    expect(localDay()).toBe('2026-01-05');
    vi.setSystemTime(new Date(2026, 10, 15, 0, 0));
    expect(localDay()).toBe('2026-11-15');
  });

  it('starts the UTC day at midnight, the same number all day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 15, 8, 30)));
    const morning = startOfUtcDay();
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 15, 23, 59)));
    expect(startOfUtcDay()).toBe(morning);
    expect(morning).toBe(Date.UTC(2026, 10, 15));
  });

  it('ticks once a minute until it is unsubscribed', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', globalThis);
    const onChange = vi.fn();
    const stop = subscribeToMinute(onChange);
    vi.advanceTimersByTime(180_000);
    expect(onChange).toHaveBeenCalledTimes(3);
    stop();
    vi.advanceTimersByTime(180_000);
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
