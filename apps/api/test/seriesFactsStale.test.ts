import { marshall } from '@aws-sdk/util-dynamodb';
import { describe, expect, it, vi } from 'vitest';

import { claim } from '@/lib/db/cache/singleFlight';
import { runWithDeadline } from '@/lib/deadline';
import { getSeriesFacts, getSeriesFactsReport } from '@/lib/seriesFacts';
import { db } from './db';
import { timeToSettle } from './fakeClock';
import {
  onTmdb,
  requestedUrls,
  resetRequests,
  setUpstreamConditions,
} from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 10, 1);

const show = (id: number, name = `Show ${id}`) =>
  fakeShow({ id, name, seasons: [{ airDate: '2019-05-06', episodes: 5 }] });

const tmdbCalls = () =>
  requestedUrls().filter((url) => /^\/3\/tv\/\d+$/.test(url.pathname)).length;

const factsRow = (id: number) =>
  db.dump('Cache').find((item) => item.pk === `CACHE#series-facts:v1:${id}`);

describe('series facts on the personal routes: served stale, refreshed a few at a time', () => {
  it('serves facts past their day and refreshes them, at most 20 a read, oldest first', async () => {
    vi.useFakeTimers({ now: T0, toFake: ['Date'] });
    const ids = Array.from({ length: 30 }, (_, index) => 100 + index);
    for (const id of ids) {
      show(id);
    }
    // Stored over the first 30 hours: id 100 the oldest
    for (const [index, id] of ids.entries()) {
      vi.setSystemTime(T0 + index * HOUR);
      await getSeriesFacts([id]);
    }
    // TMDB renames every show: a refreshed entry says so
    for (const id of ids) {
      show(id, `Renamed ${id}`);
    }
    resetRequests();
    vi.setSystemTime(T0 + 3 * DAY);

    const facts = await getSeriesFacts(ids);

    expect(facts.size).toBe(30);
    expect(tmdbCalls()).toBe(20);
    const renamed = ids.filter((id) =>
      facts.get(id)?.title.startsWith('Renamed'),
    );
    expect(renamed).toEqual(ids.slice(0, 20));
  });

  it('keeps the old entry, and its life, when a refresh fails', async () => {
    vi.useFakeTimers({ now: T0, toFake: ['Date'] });
    show(1);
    await getSeriesFacts([1]);
    const stored = factsRow(1);
    onTmdb('/tv/1', {}, { status: 500 });
    vi.setSystemTime(T0 + 2 * DAY);

    const facts = await getSeriesFacts([1]);

    expect(facts.get(1)).toMatchObject({ title: 'Show 1' });
    expect(factsRow(1)).toEqual(stored);
  });

  it('keeps an entry for 7 days, then fetches it again', async () => {
    vi.useFakeTimers({ now: T0, toFake: ['Date'] });
    show(1);
    await getSeriesFacts([1]);
    expect(Number(factsRow(1)?.expiresAt) * 1000 - T0).toBe(7 * DAY);

    onTmdb('/tv/1', {}, { status: 500 });
    vi.setSystemTime(T0 + 8 * DAY);
    expect((await getSeriesFacts([1])).get(1)).toBeUndefined();
  });

  it('spreads the soft life over 24 to 30 hours, so a library doesn’t go stale at once', async () => {
    vi.useFakeTimers({ now: T0, toFake: ['Date'] });
    const ids = Array.from({ length: 40 }, (_, index) => 300 + index);
    for (const id of ids) {
      show(id);
    }
    await getSeriesFacts(ids);
    resetRequests();

    vi.setSystemTime(T0 + 24 * HOUR - 1);
    await getSeriesFacts(ids);
    expect(tmdbCalls()).toBe(0);

    vi.setSystemTime(T0 + 27 * HOUR);
    await getSeriesFacts(ids);
    const refreshedBy27h = tmdbCalls();
    expect(refreshedBy27h).toBeGreaterThan(0);
    expect(refreshedBy27h).toBeLessThan(40);
  });

  it('fetches at most 100 missing shows a read, and none once time is short', async () => {
    vi.useFakeTimers({ now: T0, toFake: ['Date'] });
    const ids = Array.from({ length: 130 }, (_, index) => 500 + index);
    for (const id of ids) {
      show(id);
    }

    const facts = await getSeriesFacts(ids);
    expect(facts.size).toBe(100);
    expect(tmdbCalls()).toBe(100);

    resetRequests();
    const short = await runWithDeadline(1000, () => getSeriesFacts([900, 901]));
    expect(short.size).toBe(0);
    expect(tmdbCalls()).toBe(0);
  });

  it('leaves the shared routes’ strict rule alone: past its day it is fetched, a failure is reported', async () => {
    vi.useFakeTimers({ now: T0, toFake: ['Date'] });
    show(1);
    await getSeriesFactsReport([1]);
    resetRequests();
    vi.setSystemTime(T0 + 25 * HOUR);

    await getSeriesFactsReport([1]);
    expect(tmdbCalls()).toBe(1);
  });

  it('stores only the fields the callers read: a 40-season show with long names stays a few KB', async () => {
    fakeShow({
      extra: {
        genres: Array.from({ length: 10 }, (_, id) => ({
          id,
          name: 'x'.repeat(50),
        })),
        networks: Array.from({ length: 10 }, (_, id) => ({
          id,
          logo_path: '/l.png',
          name: 'N'.repeat(100),
        })),
        origin_country: ['US', 'GB', 'CA', 'AU', 'NZ'],
        overview: 'o'.repeat(10_000),
      },
      id: 7,
      name: 'T'.repeat(500),
      seasons: Array.from({ length: 40 }, () => ({
        airDate: '2001-01-01',
        episodes: 26,
      })),
    });
    await getSeriesFacts([7]);
    const bytes = JSON.stringify(marshall(factsRow(7) ?? {})).length;
    console.log(`[SIZE] series-facts for a 40-season show: ${bytes} bytes`);
    expect(bytes).toBeLessThan(10_000);
  });
});

describe('one refresh of a stale show across Lambdas (single-flight)', () => {
  it('refreshes a show once when many reads find it stale at once', async () => {
    vi.useFakeTimers({ now: T0, toFake: ['Date'] });
    show(1);
    await getSeriesFacts([1]);
    show(1, 'Renamed 1');
    resetRequests();
    vi.setSystemTime(T0 + 2 * DAY);

    const reads = await Promise.all(
      Array.from({ length: 20 }, () => getSeriesFacts([1])),
    );

    expect(tmdbCalls()).toBe(1);
    // Every read still has the show: the others serve the stored facts
    expect(reads.every((facts) => facts.has(1))).toBe(true);
  });

  it('leaves a stale show to the Lambda already refreshing it', async () => {
    vi.useFakeTimers({ now: T0, toFake: ['Date'] });
    show(1);
    await getSeriesFacts([1]);
    resetRequests();
    vi.setSystemTime(T0 + 2 * DAY);
    // Another instance claimed the refresh a moment ago
    expect(await claim('series-facts-refresh:v1:1', 60)).toBe(true);

    const facts = await getSeriesFacts([1]);

    expect(facts.get(1)?.title).toBe('Show 1');
    expect(tmdbCalls()).toBe(0);
  });
});

describe('a personal read never waits on refreshing facts it has', () => {
  it('answers with the stored facts within a short budget while TMDB is slow, and stores the refresh when it ends', async () => {
    vi.useFakeTimers({
      now: T0,
      toFake: ['setTimeout', 'clearTimeout', 'Date'],
    });
    show(1);
    await getSeriesFacts([1]);
    show(1, 'Renamed 1');
    vi.setSystemTime(T0 + 2 * DAY);
    setUpstreamConditions({ latencyMs: 1500 });

    // Past TMDB's 1.5 s, so the refresh ends inside the test
    const { ms, value: facts } = await timeToSettle(
      () => getSeriesFacts([1]),
      3_000,
    );

    expect(ms).toBeLessThan(800);
    expect(facts.get(1)?.title).toBe('Show 1');
    expect(factsRow(1)?.value).toContain('Renamed 1');
  });

  it('still waits for facts it doesn’t have', async () => {
    show(2);
    setUpstreamConditions({ latencyMs: 600 });

    const facts = await getSeriesFacts([2]);

    expect(facts.get(2)?.title).toBe('Show 2');
  });
});
