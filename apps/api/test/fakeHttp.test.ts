import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  callsPerSecond,
  onGet,
  peakRequestsInFlight,
  setUpstreamConditions,
} from './fakeHttp';

const URL_A = 'https://upstream.test/a';

describe('the fake upstream conditions', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    onGet(URL_A, { ok: true });
  });

  it('answers 429 with Retry-After past the rate limit, per second', async () => {
    setUpstreamConditions({ rateLimit: { perSecond: 3, retryAfter: 20 } });

    const first = await Promise.all(
      Array.from({ length: 5 }, () => fetch(URL_A)),
    );
    vi.advanceTimersByTime(1000);
    const later = await fetch(URL_A);

    expect(first.map((response) => response.status)).toEqual([
      200, 200, 200, 429, 429,
    ]);
    expect(first[3]?.headers.get('retry-after')).toBe('20');
    expect(later.status).toBe(200);
    expect(callsPerSecond()).toEqual([5, 1]);
  });

  it('fails everything in an outage', async () => {
    setUpstreamConditions({ outage: { status: 503 } });

    expect((await fetch(URL_A)).status).toBe(503);
  });

  it('adds latency and tracks the peak in flight', async () => {
    setUpstreamConditions({ latencyMs: 200 });

    const pending = Promise.all([fetch(URL_A), fetch(URL_A)]);
    await vi.advanceTimersByTimeAsync(199);
    expect(peakRequestsInFlight()).toBe(2);
    await vi.advanceTimersByTimeAsync(1);

    expect((await pending).map((response) => response.status)).toEqual([
      200, 200,
    ]);
  });
});
