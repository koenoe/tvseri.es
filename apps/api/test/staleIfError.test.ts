import { describe, expect, it, vi } from 'vitest';

import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { readThrough } from '@/lib/db/cache/readThrough';
import { getSeriesFactsReport } from '@/lib/seriesFacts';

import { onTmdb, requestedUrls } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';

const DAY = 24 * 60 * 60 * 1000;

describe('readThrough: stale if error', () => {
  it('serves an expired value when the load fails, without storing it again', async () => {
    // Past its expiresAt, but DynamoDB has not swept it yet
    await setCacheItem('k', { n: 1 }, { ttl: -60 });

    const value = await readThrough('k', 3600, async () => {
      throw new Error('TMDB down');
    });

    expect(value).toEqual({ n: 1 });
    expect(await getCacheItem('k')).toBeUndefined();
  });

  it('replaces an expired value when the load works', async () => {
    await setCacheItem('k', { n: 1 }, { ttl: -60 });

    expect(await readThrough('k', 3600, async () => ({ n: 2 }))).toEqual({
      n: 2,
    });
    expect(await getCacheItem('k')).toEqual({ n: 2 });
  });

  it('still fails without anything stored', async () => {
    await expect(
      readThrough('k', 3600, async () => {
        throw new Error('TMDB down');
      }),
    ).rejects.toThrow('TMDB down');
  });

  it('serves a fresh value without loading', async () => {
    await setCacheItem('k', { n: 1 }, { ttl: 60 });
    const load = vi.fn(async () => ({ n: 2 }));

    expect(await readThrough('k', 3600, load)).toEqual({ n: 1 });
    expect(load).not.toHaveBeenCalled();
  });
});

describe('series facts: stale if error', () => {
  const chernobyl = () =>
    fakeShow({
      id: 87108,
      name: 'Chernobyl',
      seasons: [{ airDate: '2019-05-06', episodes: 5, runtime: 60 }],
    });

  it('keeps a show whose facts are past their day when TMDB fails', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 1), toFake: ['Date'] });
    chernobyl();
    const first = await getSeriesFactsReport([87108]);

    // Two days on the facts are expired (still in the table); TMDB fails
    vi.setSystemTime(Date.UTC(2026, 10, 1) + 2 * DAY);
    onTmdb('/tv/87108', {}, { status: 500 });
    const later = await getSeriesFactsReport([87108]);

    expect(later.failed.size).toBe(0);
    expect(later.facts.get(87108)).toEqual(first.facts.get(87108));
    // It did try TMDB first (a retry included)
    expect(
      requestedUrls().filter((url) => url.pathname === '/3/tv/87108').length,
    ).toBe(3);
  });

  it('still reports a failure without stored facts', async () => {
    onTmdb('/tv/87108', {}, { status: 500 });

    const report = await getSeriesFactsReport([87108]);

    expect([...report.failed]).toEqual([87108]);
    expect(report.facts.size).toBe(0);
  });
});
