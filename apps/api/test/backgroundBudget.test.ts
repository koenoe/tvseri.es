import { describe, expect, it, vi } from 'vitest';

import {
  onTmdb,
  peakRequestsInFlight,
  setUpstreamConditions,
} from './fakeHttp';

/**
 * The Lambdas that aren't the API (the watched stream, the Plex queue,
 * the nightly job) import no Hono app, so their TMDB calls keep the
 * background budget: 4 in flight, 5 started a second. The API's app.ts
 * switches its own Lambda to 8 and 15.
 */

const fanOut = async (count: number) => {
  const { getShow } = await import('@/lib/catalogue');
  setUpstreamConditions({ latencyMs: 100 });
  for (let id = 1; id <= count; id++) {
    onTmdb(`/tv/${id}`, { id, name: `Show ${id}` });
  }
  const pending = Promise.all(
    Array.from({ length: count }, (_, index) => getShow(index + 1)),
  );
  await vi.advanceTimersByTimeAsync(5000);
  await pending;
};

describe('the TMDB budget per kind of Lambda', () => {
  it('keeps the stream, queue and nightly Lambdas at 4 in flight', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    await import('@/lambdas/watched');
    await import('@/lambdas/scrobble');
    await import('@/lambdas/validateWatchedStatusQueue');

    await fanOut(12);

    expect(peakRequestsInFlight()).toBe(4);
  });

  it('gives the API Lambda 8', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    await import('@/app');

    await fanOut(12);

    expect(peakRequestsInFlight()).toBe(8);
  });
});
