import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { acrossCacheBoundary } from '@/lib/cache/testing/cacheBoundary';

const { apiFetch, cacheLife, cacheTag } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));
// the real cached loader, seen as Next serves it from its cache entry: the
// first call fills the entry, later ones get the entry
const { entries } = vi.hoisted(() => ({
  entries: new Map<number, Promise<unknown>>(),
}));
vi.mock('./loaders', async (importOriginal) => {
  const loaders = await importOriginal<typeof import('./loaders')>();
  const fill = acrossCacheBoundary(loaders.loadSeries);
  const loadSeries = (id: number) => {
    const entry = entries.get(id) ?? fill(id);
    entries.set(id, entry);
    return entry;
  };
  return { ...loaders, loadSeries };
});

const { loadSeriesForWrite } = await import('./forWrite');

const SERIES = { id: 7, title: 'Show' };

beforeEach(() => {
  vi.clearAllMocks();
  entries.clear();
});

/** An earlier visit filled the entry with this answer */
const warm = async (answer: () => Promise<unknown>) => {
  apiFetch.mockImplementationOnce(answer);
  const { loadSeries } = await import('./loaders');
  await loadSeries(7);
  apiFetch.mockClear();
};

describe('loadSeriesForWrite', () => {
  it('reads the cached show and nothing else when the cache holds it', async () => {
    apiFetch.mockResolvedValue(SERIES);
    await expect(loadSeriesForWrite(7)).resolves.toEqual(SERIES);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('does not trust a cached outage: one read without the cache, and the write goes on', async () => {
    // an earlier fill failed (kept for the `unavailable` life); the API is back
    await warm(() => Promise.reject(new ApiError(503)));
    apiFetch.mockResolvedValueOnce(SERIES);
    await expect(loadSeriesForWrite(7)).resolves.toEqual(SERIES);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenLastCalledWith('/series/:id', {
      notFound: 'null',
      params: { id: 7 },
      query: { include_images: true },
    });
  });

  it('fails the write when the API is still down', async () => {
    await warm(() => Promise.reject(new ApiError(503)));
    apiFetch.mockRejectedValue(new ApiError(0, 'ApiTimeout'));
    await expect(loadSeriesForWrite(7)).rejects.toMatchObject({
      code: 'ApiTimeout',
      status: 0,
    });
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('asks once and fails fast when the cache was empty and this very read failed', async () => {
    apiFetch.mockRejectedValue(new ApiError(429));
    await expect(loadSeriesForWrite(7)).rejects.toMatchObject({
      status: 503,
    });
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('passes a show the API does not know as null', async () => {
    apiFetch.mockResolvedValue(null);
    await expect(loadSeriesForWrite(7)).resolves.toBeNull();
  });
});
