import type { Season, TvSeries } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getViewer = vi.fn();
const apiFetch = vi.fn();
const refresh = vi.fn();
const searchSeries = vi.fn();
const loadSeriesForWrite = vi.fn();
const loadSeason = vi.fn();
const revalidateViewerStats = vi.fn();

vi.mock('@/auth/viewer', () => ({ getViewer: () => getViewer() }));
vi.mock('next/cache', () => ({ refresh: () => refresh() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));
vi.mock('@/lib/import/loaders', () => ({
  searchSeries: (...args: unknown[]) => searchSeries(...args),
}));
vi.mock('@/lib/series/forWrite', () => ({
  loadSeriesForWrite: (...args: unknown[]) => loadSeriesForWrite(...args),
}));
vi.mock('@/lib/stats/revalidateViewerStats', () => ({
  revalidateViewerStats: (...args: unknown[]) => revalidateViewerStats(...args),
}));
vi.mock('@/lib/series/loaders', () => ({
  loadSeason: (...args: unknown[]) => loadSeason(...args),
}));

import {
  dismissEntries,
  moreUnresolved,
  resolveEntries,
} from './reviewActions';

const VIEWER = { accessToken: 'session-token', id: 'U1', role: 'user' };

const TOP_BOY = {
  id: 7,
  numberOfSeasons: 1,
  posterImage: '',
  posterPath: '/p.jpg',
  seasons: [{ seasonNumber: 1 }],
  slug: 'top-boy',
  title: 'Top Boy',
} as unknown as TvSeries;

const SEASON_1 = {
  episodes: [
    { airDate: '2019-09-13', episodeNumber: 1, runtime: 50, title: 'One' },
    { airDate: '2019-09-13', episodeNumber: 2, runtime: 50, title: 'Two' },
  ],
} as unknown as Season;

const entry = (key: string, episode: string, watchedAt = 1_000) => ({
  key,
  row: { episode, season: 'Season 1', title: 'Top Boy' },
  watchedAt,
});

beforeEach(() => {
  for (const mock of [
    getViewer,
    apiFetch,
    refresh,
    searchSeries,
    loadSeriesForWrite,
    loadSeason,
    revalidateViewerStats,
  ]) {
    mock.mockReset();
  }
  getViewer.mockResolvedValue(VIEWER);
  loadSeriesForWrite.mockResolvedValue(TOP_BOY);
  loadSeason.mockResolvedValue(SEASON_1);
  apiFetch.mockResolvedValue({ closed: 1, skipped: 0, written: 1 });
});

describe('signed out', () => {
  it.each([
    ['moreUnresolved', () => moreUnresolved('netflix', '8123')],
    ['dismissEntries', () => dismissEntries('netflix', { keys: ['1'] })],
    [
      'resolveEntries',
      () =>
        resolveEntries('netflix', {
          entries: [entry('1', 'One')],
          pick: { kind: 'series', seriesId: 7 },
        }),
    ],
  ])('%s says unauthenticated and never calls the API', async (_n, run) => {
    getViewer.mockResolvedValue(null);
    expect(await run()).toEqual({ error: 'unauthenticated', ok: false });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('a service it can’t connect', () => {
  it.each([
    ['moreUnresolved', () => moreUnresolved('hulu', null)],
    ['dismissEntries', () => dismissEntries('hulu', { keys: ['1'] })],
    [
      'resolveEntries',
      () =>
        resolveEntries('hulu', {
          entries: [entry('1', 'One')],
          pick: { kind: 'series', seriesId: 7 },
        }),
    ],
  ])('%s is refused without calling the API', async (_n, run) => {
    expect(await run()).toEqual({ error: 'invalid', ok: false });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('resolveEntries', () => {
  it('writes the picked series’ episodes and closes only the matched keys', async () => {
    const result = await resolveEntries('netflix', {
      entries: [entry('11', 'One', 5_000), entry('12', 'Episode 9')],
      pick: { kind: 'series', seriesId: 7 },
    });

    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [path, init] = apiFetch.mock.calls[0] ?? [];
    expect(path).toBe('/me/connections/:service/unresolved/resolve');
    expect(init.params).toEqual({ service: 'netflix' });
    expect(init.accessToken).toBe('session-token');
    expect(init.body.keys).toEqual(['11']);
    expect(init.body.items).toHaveLength(1);
    expect(init.body.items[0]).toMatchObject({
      episode: { episodeNumber: 1, seasonNumber: 1, title: 'One' },
      tvSeries: { id: 7, slug: 'top-boy' },
      watchedAt: 5_000,
      watchProvider: null,
    });

    // The unmatched one stays open, now asking which episode it was
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.closed).toEqual(['11']);
    expect(result.data.written).toBe(1);
    expect(result.data.open).toEqual([
      expect.objectContaining({
        key: '12',
        kind: 'episode-not-found',
        series: expect.objectContaining({ id: 7, title: 'Top Boy' }),
      }),
    ]);
    expect(result.data.open[0]?.episodes).toHaveLength(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    // the watched history changed: the viewer's stats catch up
    expect(revalidateViewerStats).toHaveBeenCalledWith('U1');
  });

  it('leaves the stats alone when the API wrote nothing new', async () => {
    apiFetch.mockResolvedValue({ written: 0 });
    await resolveEntries('netflix', {
      entries: [entry('11', 'One')],
      pick: { kind: 'series', seriesId: 7 },
    });
    expect(revalidateViewerStats).not.toHaveBeenCalled();
  });

  it('writes the exact episode picked by hand', async () => {
    await resolveEntries('netflix', {
      entries: [entry('21', 'Recap')],
      pick: {
        episodeNumber: 2,
        kind: 'episode',
        seasonNumber: 1,
        seriesId: 7,
      },
    });
    const [, init] = apiFetch.mock.calls[0] ?? [];
    expect(init.body.keys).toEqual(['21']);
    expect(init.body.items[0].episode.episodeNumber).toBe(2);
  });

  it('posts nothing when nothing matched', async () => {
    loadSeriesForWrite.mockResolvedValue(null);
    const result = await resolveEntries('netflix', {
      entries: [entry('31', 'One')],
      pick: { kind: 'series', seriesId: 7 },
    });
    expect(apiFetch).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      data: {
        closed: [],
        open: [
          expect.objectContaining({ key: '31', kind: 'series-not-found' }),
        ],
        written: 0,
      },
      ok: true,
    });
  });

  it('refuses keys that aren’t Netflix ids', async () => {
    const result = await resolveEntries('netflix', {
      entries: [entry('../x', 'One')],
      pick: { kind: 'series', seriesId: 7 },
    });
    expect(result).toEqual({ error: 'invalid', ok: false });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('writes a long pick in chunks of 100 keys', async () => {
    const entries = Array.from({ length: 150 }, (_, index) =>
      entry(String(index + 1), 'One'),
    );
    apiFetch.mockResolvedValue({ written: 1 });
    const result = await resolveEntries('netflix', {
      entries,
      pick: { kind: 'series', seriesId: 7 },
    });
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch.mock.calls[0]?.[1].body.keys).toHaveLength(100);
    expect(apiFetch.mock.calls[0]?.[1].body.items).toHaveLength(100);
    expect(apiFetch.mock.calls[1]?.[1].body.keys).toHaveLength(50);
    expect(result).toMatchObject({
      data: { failed: null, written: 2 },
      ok: true,
    });
    if (result.ok) expect(result.data.closed).toHaveLength(150);
  });

  it('keeps the chunks written before a failure closed, and says it failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const entries = Array.from({ length: 150 }, (_, index) =>
      entry(String(index + 1), 'One'),
    );
    apiFetch
      .mockResolvedValueOnce({ written: 100 })
      .mockRejectedValueOnce(new Error('down'));
    const result = await resolveEntries('netflix', {
      entries,
      pick: { kind: 'series', seriesId: 7 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.closed).toEqual(entries.slice(0, 100).map((e) => e.key));
    expect(result.data.failed).toBe('failed');
    expect(result.data.written).toBe(100);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(revalidateViewerStats).toHaveBeenCalledTimes(1);
  });

  it('says failed when the write fails', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await resolveEntries('netflix', {
      entries: [entry('41', 'One')],
      pick: { kind: 'series', seriesId: 7 },
    });
    expect(result).toEqual({ error: 'failed', ok: false });
  });
});

describe('dismissEntries', () => {
  it('posts the keys in chunks of 100', async () => {
    const keys = Array.from({ length: 150 }, (_, index) => String(index + 1));
    apiFetch.mockResolvedValue({ closed: 100 });
    const result = await dismissEntries('netflix', { keys });
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch.mock.calls[0]?.[0]).toBe(
      '/me/connections/:service/unresolved/dismiss',
    );
    expect(apiFetch.mock.calls[0]?.[1].body.keys).toHaveLength(100);
    expect(apiFetch.mock.calls[1]?.[1].body.keys).toHaveLength(50);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data.closed).toEqual(keys);
      expect(result.data.failed).toBeNull();
    }
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('returns the keys a failure part-way already closed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const keys = Array.from({ length: 150 }, (_, index) => String(index + 1));
    apiFetch
      .mockResolvedValueOnce({ closed: 100 })
      .mockRejectedValueOnce(new Error('down'));
    const result = await dismissEntries('netflix', { keys });
    expect(result).toEqual(
      expect.objectContaining({
        data: { closed: keys.slice(0, 100), failed: 'failed' },
        ok: true,
      }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('fails as a whole when nothing closed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    apiFetch.mockRejectedValue(new Error('down'));
    expect(await dismissEntries('netflix', { keys: ['1'] })).toEqual({
      error: 'failed',
      ok: false,
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refuses an empty list', async () => {
    expect(await dismissEntries('netflix', { keys: [] })).toEqual({
      error: 'invalid',
      ok: false,
    });
  });
});

describe('moreUnresolved', () => {
  it('reads the first page again without a cursor', async () => {
    apiFetch.mockResolvedValue({ items: [], nextCursor: 'c2' });
    expect(await moreUnresolved('netflix', null)).toMatchObject({ ok: true });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch.mock.calls[0]?.[1].query).toBeUndefined();
  });

  it('reads the next page with the cursor', async () => {
    apiFetch.mockResolvedValue({ items: [], nextCursor: null });
    const result = await moreUnresolved('netflix', '80001234');
    expect(apiFetch).toHaveBeenCalledWith(
      '/me/connections/:service/unresolved',
      expect.objectContaining({
        accessToken: 'session-token',
        params: { service: 'netflix' },
        query: { cursor: '80001234' },
      }),
    );
    expect(result).toMatchObject({
      data: { items: [], nextCursor: null },
      ok: true,
    });
  });
});
