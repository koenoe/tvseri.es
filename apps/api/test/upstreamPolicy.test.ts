import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  READ_RETRY_DEADLINE,
  UPSTREAM_ATTEMPT_TIMEOUT,
  UPSTREAM_RETRY_DELAY,
} from '@/constants';
import { setCacheItem } from '@/lib/db/cache';
import { runWithDeadline } from '@/lib/deadline';
import { createInstrumentedFetch } from '@/lib/metrics';
import { MIN_OPEN_MS } from '@/lib/upstream/breaker';
import { UpstreamUnavailableError } from '@/lib/upstream/errors';

import {
  onGet,
  onTmdb,
  requestedUrls,
  setUpstreamConditions,
} from './fakeHttp';
import { request } from './request';

const HOST = 'https://upstream.test';

const tmdbCalls = (pathname: string) =>
  requestedUrls().filter((url) => url.pathname === `/3${pathname}`).length;

const upstreamCalls = () =>
  requestedUrls().filter((url) => url.host === 'upstream.test').length;

const show = { id: 1396, name: 'Breaking Bad', seasons: [] };

describe('the TMDB policy through the API', () => {
  it('does not retry a 404: one call, cached 404', async () => {
    const response = await request('/series/999/credits');

    expect(response.status).toBe(200);
    expect(tmdbCalls('/tv/999/aggregate_credits')).toBe(1);
  });

  it('answers 404 for an unknown show after one call', async () => {
    const response = await request('/series/998');

    expect(response.status).toBe(404);
    expect(tmdbCalls('/tv/998')).toBe(1);
  });

  it('retries a 5xx once and serves the retry', async () => {
    onTmdb('/tv/1396', show, { failFirst: [502] });

    const response = await request('/series/1396');

    expect(response.status).toBe(200);
    expect((await response.json()).id).toBe(1396);
    expect(tmdbCalls('/tv/1396')).toBe(2);
  });

  it('fails (uncached) after two 5xx', async () => {
    onTmdb('/tv/1396', show, { failFirst: [503, 503] });

    const response = await request('/series/1396');

    expect(response.status).toBe(500);
    // CloudFront keeps a 5xx for its error caching TTL (10 s) whatever the
    // header; it must never carry a public profile
    expect(response.headers.get('cache-control') ?? '').not.toContain('public');
    expect(tmdbCalls('/tv/1396')).toBe(2);
  });

  it('does not retry another 4xx', async () => {
    onTmdb('/tv/1396', show, { failFirst: [401] });

    const response = await request('/series/1396');

    expect(response.status).toBe(500);
    expect(tmdbCalls('/tv/1396')).toBe(1);
  });
});

describe('a stalled TMDB call', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });

  it('is abandoned after the attempt timeout and retried once', async () => {
    onTmdb('/tv/1396', show, { stallFirst: 1 });

    const pending = request('/series/1396');
    await vi.advanceTimersByTimeAsync(
      UPSTREAM_ATTEMPT_TIMEOUT + UPSTREAM_RETRY_DELAY,
    );
    const response = await pending;

    expect(response.status).toBe(200);
    expect(tmdbCalls('/tv/1396')).toBe(2);
  });

  it('answers a read before the web gives up (10 s) even when both attempts stall', async () => {
    onTmdb('/tv/1396', show, { stallFirst: 2 });
    const started = Date.now();

    const pending = Promise.resolve(request('/series/1396'));
    let settledAt = 0;
    void pending.then(() => {
      settledAt = Date.now();
    });
    await vi.advanceTimersByTimeAsync(10_000);
    const response = await pending;

    expect(response.status).toBe(500);
    // 5 s + 0.25 s + the 2.75 s left of the 8 s deadline
    expect(settledAt - started).toBeLessThanOrEqual(READ_RETRY_DEADLINE);
    expect(tmdbCalls('/tv/1396')).toBe(2);
  });
});

describe('createInstrumentedFetch', () => {
  const client = createInstrumentedFetch(
    'test',
    { baseURL: HOST },
    { retries: 1 },
  );

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries a timeout without a deadline (writes, queues)', async () => {
    onGet(`${HOST}/a`, { ok: true }, { stallFirst: 1 });

    const pending = client('/a');
    await vi.advanceTimersByTimeAsync(
      UPSTREAM_ATTEMPT_TIMEOUT + UPSTREAM_RETRY_DELAY,
    );

    expect((await pending).data).toEqual({ ok: true });
    expect(upstreamCalls()).toBe(2);
  });

  it('starts no retry once the deadline leaves too little time', async () => {
    onGet(`${HOST}/a`, { ok: true }, { stallFirst: 1 });

    // A late call in a read: 5.5 s left, the first attempt takes 5 s
    const pending = runWithDeadline(5500, () => client('/a'));
    const outcome = pending.then(
      () => 'answered',
      (error: Error) => error.name,
    );
    await vi.advanceTimersByTimeAsync(UPSTREAM_ATTEMPT_TIMEOUT);

    expect(await outcome).toBe('TimeoutError');
    expect(upstreamCalls()).toBe(1);
  });

  it('never cuts a first attempt short: a slow cold read still completes', async () => {
    onGet(`${HOST}/a`, { ok: true }, { stallFirst: 1 });

    // The deadline has already passed (a late wave of a cold read)
    const pending = runWithDeadline(-1, () => client('/a'));
    const outcome = pending.then(
      () => 'answered',
      (error: Error) => error.name,
    );
    await vi.advanceTimersByTimeAsync(UPSTREAM_ATTEMPT_TIMEOUT - 1);
    expect(upstreamCalls()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);

    expect(await outcome).toBe('TimeoutError');
  });

  it('never retries a 429: it throws "unavailable" at once', async () => {
    onGet(`${HOST}/a`, { ok: true }, { failFirst: [429] });

    const outcome = client('/a').then(
      () => 'answered',
      (error: unknown) =>
        error instanceof UpstreamUnavailableError ? 'unavailable' : 'error',
    );

    expect(await outcome).toBe('unavailable');
    expect(upstreamCalls()).toBe(1);
  });

  it('does not retry with retries: 0', async () => {
    const once = createInstrumentedFetch(
      'test',
      { baseURL: HOST },
      { retries: 0 },
    );
    onGet(`${HOST}/a`, { ok: true }, { failFirst: [500] });

    const result = await once('/a');

    expect(result.error?.status).toBe(500);
    expect(upstreamCalls()).toBe(1);
  });
});

describe('the TMDB circuit breaker through the API', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    onTmdb('/tv/1396', show);
  });

  it('stops calling TMDB for as long as Retry-After says, then probes once', async () => {
    setUpstreamConditions({ rateLimit: { perSecond: 0, retryAfter: 20 } });

    const limited = await request('/series/1396');
    expect(limited.status).toBe(503);
    expect(limited.headers.get('retry-after')).toBe('20');
    expect(tmdbCalls('/tv/1396')).toBe(1);

    // Open: every read fails fast, without a call
    setUpstreamConditions({});
    vi.advanceTimersByTime(19_000);
    const fast = await request('/series/1396');
    expect(fast.status).toBe(503);
    expect(tmdbCalls('/tv/1396')).toBe(1);

    // Past Retry-After: one probe, which answers, and it closes
    vi.advanceTimersByTime(1000);
    expect((await request('/series/1396')).status).toBe(200);
    expect((await request('/series/1396')).status).toBe(200);
    expect(tmdbCalls('/tv/1396')).toBe(3);
  });

  it('waits at least 10 s when the 429 says nothing', async () => {
    setUpstreamConditions({ rateLimit: { perSecond: 0 } });
    await request('/series/1396');
    setUpstreamConditions({});

    vi.advanceTimersByTime(MIN_OPEN_MS - 1);
    expect((await request('/series/1396')).status).toBe(503);
    vi.advanceTimersByTime(1);
    expect((await request('/series/1396')).status).toBe(200);
  });

  it('serves the stored value while open, without a call', async () => {
    // A stored career past its freshness
    const career = { guest: { count: 0, ticks: [] }, rows: [], upcoming: [] };
    await setCacheItem(
      'person-career:v3:31',
      { freshUntil: Date.now() - 60_000, value: career },
      { ttl: 86_400 },
    );
    setUpstreamConditions({ rateLimit: { perSecond: 0 } });
    await request('/series/1396');
    const calls = requestedUrls().length;

    const response = await request('/person/31/career');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(career);
    expect(requestedUrls()).toHaveLength(calls);
  });

  it('opens on an outage of 5xx answers, not on one', async () => {
    // The 5xx retry waits 250 ms: real time
    vi.useRealTimers();
    setUpstreamConditions({ outage: { status: 503 } });
    for (let index = 0; index < 3; index++) {
      await request(`/series/${2000 + index}`);
    }
    const calls = requestedUrls().length;

    expect((await request('/series/1396')).status).toBe(503);
    expect(requestedUrls()).toHaveLength(calls);
  });
});
