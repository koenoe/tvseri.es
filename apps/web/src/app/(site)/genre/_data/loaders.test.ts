import { cacheLife } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import {
  discoverPage,
  ownLife,
  UNAVAILABLE,
} from '../../_discover/data/loaderTesting';

const apiFetch = vi.fn();

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

beforeEach(() => {
  apiFetch.mockReset();
  vi.mocked(cacheLife).mockClear();
});
const { getBestInGenre, genreRows, GENRE_ROW } = await import('./rows');

describe('genre loaders when the API fails', () => {
  it('passes a failed summaries read on instead of caching a list without networks', async () => {
    apiFetch.mockImplementation((path: string) =>
      path === '/discover'
        ? Promise.resolve(discoverPage(1, 2))
        : Promise.reject(new ApiError(503)),
    );
    await expect(getBestInGenre('crime')).resolves.toEqual(UNAVAILABLE);
    expect(ownLife(2)).toBe('unavailable');
  });

  it('gives a row Unavailable (its skeleton) when its shows fail', async () => {
    apiFetch.mockRejectedValue(new ApiError(0, 'ApiTimeout'));
    const rows = genreRows('crime');
    for (const index of Object.values(GENRE_ROW)) {
      await expect(rows[index]?.()).resolves.toEqual(UNAVAILABLE);
    }
  });

  it('caches the list on its profile when every read works', async () => {
    apiFetch.mockImplementation((path: string) =>
      Promise.resolve(path === '/discover' ? discoverPage(1) : {}),
    );
    await expect(getBestInGenre('crime')).resolves.toHaveLength(1);
    expect(ownLife(2)).toBe('medium');
  });
});
