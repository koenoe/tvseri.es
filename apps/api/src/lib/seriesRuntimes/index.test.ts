import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchTvSeriesRuntimes: vi.fn(),
  getCacheEntries: vi.fn(),
  setCacheItems: vi.fn(),
}));

vi.mock('@/lib/db/cache', () => ({
  getCacheEntries: mocks.getCacheEntries,
  setCacheItems: mocks.setCacheItems,
}));
vi.mock('@/lib/tmdb/seasons', () => ({
  fetchTvSeriesRuntimes: mocks.fetchTvSeriesRuntimes,
}));
vi.mock('@/utils/logWarn', () => ({ logWarn: () => undefined }));

import { getSeriesRuntimes, getSeriesRuntimesOf } from './index';

const entry = (value: unknown, expired = false) => ({ expired, value });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCacheEntries.mockResolvedValue(new Map());
  mocks.setCacheItems.mockResolvedValue(undefined);
});

describe('getSeriesRuntimes', () => {
  it('serves cached shows without asking TMDB', async () => {
    mocks.getCacheEntries.mockResolvedValue(
      new Map([['series-runtimes:v1:1', entry({ 1: [40, 52] })]]),
    );

    const found = await getSeriesRuntimes([{ id: 1 }]);

    expect(found.get(1)).toEqual({ 1: [40, 52] });
    expect(mocks.fetchTvSeriesRuntimes).not.toHaveBeenCalled();
  });

  it('reads a miss once from TMDB, with the known seasons, and keeps it', async () => {
    mocks.fetchTvSeriesRuntimes.mockResolvedValue({ 1: [33, 37] });

    const found = await getSeriesRuntimes([
      { id: 2, seasons: [1] },
      { id: 2, seasons: [1] },
    ]);

    expect(found.get(2)).toEqual({ 1: [33, 37] });
    expect(mocks.fetchTvSeriesRuntimes).toHaveBeenCalledTimes(1);
    expect(mocks.fetchTvSeriesRuntimes).toHaveBeenCalledWith(2, [1]);
    expect(mocks.setCacheItems).toHaveBeenCalledWith(
      [['series-runtimes:v1:2', { 1: [33, 37] }]],
      { ttl: 6 * 60 * 60 },
    );
  });

  it('leaves a failed show out, or serves its expired entry', async () => {
    mocks.getCacheEntries.mockResolvedValue(
      new Map([['series-runtimes:v1:4', entry({ 1: [20] }, true)]]),
    );
    mocks.fetchTvSeriesRuntimes.mockRejectedValue(new Error('TMDB down'));

    const found = await getSeriesRuntimes([{ id: 3 }, { id: 4 }]);

    expect(found.has(3)).toBe(false);
    expect(found.get(4)).toEqual({ 1: [20] });
  });
});

describe('getSeriesRuntimesOf', () => {
  it('throws a TMDB failure when nothing can stand in (the route answers 5xx)', async () => {
    mocks.fetchTvSeriesRuntimes.mockRejectedValue(new Error('TMDB down'));

    await expect(getSeriesRuntimesOf(5)).rejects.toThrow('TMDB down');
  });

  it('is undefined for a show TMDB does not know, kept for an hour', async () => {
    mocks.fetchTvSeriesRuntimes.mockResolvedValue(undefined);

    expect(await getSeriesRuntimesOf(6)).toBeUndefined();
    expect(mocks.setCacheItems).toHaveBeenCalledWith(
      [['series-runtimes:v1:6', null]],
      { ttl: 60 * 60 },
    );
  });
});
