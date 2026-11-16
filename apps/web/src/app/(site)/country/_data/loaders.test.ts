import { cacheLife } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { discoverPage, UNAVAILABLE } from '../../_discover/data/loaderTesting';

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
const { countryRowLoaders } = await import('./rows');

describe('country rows when the API fails', () => {
  it('gives each row Unavailable (its skeleton)', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    const rows = countryRowLoaders('GB', { kind: 'best' });
    for (const load of rows) {
      vi.mocked(cacheLife).mockClear();
      await expect(load()).resolves.toEqual(UNAVAILABLE);
      // every entry of a failed run is short-lived: nothing empty is cached long
      const lives = vi.mocked(cacheLife).mock.calls.map(([life]) => life);
      expect(new Set(lives)).toEqual(new Set(['unavailable']));
    }
  });

  it('fills the rows when the API answers', async () => {
    apiFetch.mockResolvedValue(discoverPage(1, 2));
    const rows = countryRowLoaders('GB', { kind: 'best' });
    await expect(rows[2]?.()).resolves.toMatchObject({ kind: 'shows' });
  });
});
