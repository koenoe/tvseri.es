import { cacheLife } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { onlyLife, UNAVAILABLE } from './loaderTesting';

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
const { getNetworkDetails } = await import('./network');

describe('getNetworkDetails (the hub’s Essentials logo and the network hero)', () => {
  it('trims the network to its logo and country, cached long', async () => {
    apiFetch.mockResolvedValueOnce({
      id: 49,
      logo: 'https://image.tmdb.org/t/p/w500/hbo.png',
      logoSilhouette: false,
      name: 'HBO',
      originCountry: { code: 'US', name: 'United States' },
    });
    // the logo's PNG header: 500 × 200
    const head = new Uint8Array(24);
    head.set([0x89, 0x50, 0x4e, 0x47]);
    new DataView(head.buffer).setUint32(16, 500);
    new DataView(head.buffer).setUint32(20, 200);
    const fetchLogo = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(head, { status: 206 }));
    await expect(getNetworkDetails(49)).resolves.toEqual({
      country: 'United States',
      logo: 'https://image.tmdb.org/t/p/w500/hbo.png',
      logoRatio: 2.5,
      logoSilhouette: false,
    });
    expect(fetchLogo.mock.calls[0]?.[0]).toBe(
      'https://image.tmdb.org/t/p/w500/hbo.png',
    );
    fetchLogo.mockRestore();
    expect(apiFetch).toHaveBeenCalledWith('/network/:id', {
      notFound: 'null',
      params: { id: 49 },
    });
    expect(onlyLife()).toBe('long');
  });

  it('keeps an unknown network a real, long-cached null', async () => {
    apiFetch.mockResolvedValueOnce(null);
    await expect(getNetworkDetails(1)).resolves.toBeNull();
    expect(onlyLife()).toBe('long');
  });

  it('gives Unavailable with a short life when the API fails', async () => {
    apiFetch.mockRejectedValue(new ApiError(0, 'ApiNetworkError'));
    await expect(getNetworkDetails(49)).resolves.toEqual(UNAVAILABLE);
    expect(onlyLife()).toBe('unavailable');
  });
});
