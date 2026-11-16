import { cacheLife, cacheTag } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { loadTrendingShows } from './trending';

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

beforeEach(() => {
  vi.mocked(cacheLife).mockClear();
  vi.mocked(cacheTag).mockClear();
});

describe('loadTrendingShows', () => {
  it('reads the trending collection, tagged home, kept for the API’s life', async () => {
    apiFetch.mockResolvedValue([{ id: 95480 }]);
    await expect(loadTrendingShows()).resolves.toEqual([{ id: 95480 }]);
    expect(apiFetch).toHaveBeenCalledWith('/collection/trending');
    expect(cacheTag).toHaveBeenCalledWith('home');
    expect(cacheLife).toHaveBeenLastCalledWith('short');
  });

  it('keeps an outage only for the outage life', async () => {
    apiFetch.mockImplementation(async () => {
      throw new ApiError(503, 'Service temporarily unavailable');
    });
    await expect(loadTrendingShows()).resolves.toEqual({ unavailable: true });
    expect(cacheLife).toHaveBeenLastCalledWith('unavailable');
    expect(cacheLife).not.toHaveBeenCalledWith('short');
  });
});
