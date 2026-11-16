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
const { discoverQueryString } = await import('../../_discover/data/discover');
const { getNetworkSince } = await import('./since');
const { getNetworkSpotlight } = await import('./spotlight');

describe('network loaders when the API fails', () => {
  it('gives Unavailable with a short life', async () => {
    apiFetch.mockRejectedValue(new ApiError(0, 'ApiNetworkError'));
    await expect(getNetworkSpotlight(49)).resolves.toEqual(UNAVAILABLE);
    // the running list's own run, then the spotlight's
    expect(ownLife(1)).toBe('unavailable');
    await expect(getNetworkSince(49)).resolves.toEqual(UNAVAILABLE);
  });
});

describe('the network spotlight’s logo', () => {
  it('carries the show’s title treatment from /series/:id', async () => {
    apiFetch.mockImplementation(async (path: string) =>
      path === '/discover'
        ? discoverPage(9)
        : {
            ...discoverPage(9).items[0],
            description: 'A show.',
            titleTreatmentImage: 'logo-9.png',
          },
    );
    const spot = await getNetworkSpotlight(49);
    expect(spot && 'logo' in spot && spot.logo).toBe('logo-9.png');
  });
});

const showOf = (id: number) => ({
  ...discoverPage(id).items[0],
  description: 'A show.',
});

describe('the network spotlight’s reads', () => {
  it('reads the "Still running" row’s list and the show page’s show', async () => {
    apiFetch.mockImplementation(async (path: string) =>
      path === '/discover' ? discoverPage(9) : showOf(9),
    );
    await getNetworkSpotlight(49);
    const running = Object.fromEntries(
      new URLSearchParams(
        discoverQueryString({ with_networks: '49', with_status: '0' }),
      ),
    );
    expect(apiFetch.mock.calls).toEqual([
      ['/discover', { query: { ...running, page: undefined } }],
      [
        '/series/:id',
        {
          notFound: 'null',
          params: { id: 9 },
          query: { include_images: true },
        },
      ],
    ]);
  });

  it('falls back to the most popular show when nothing is running', async () => {
    apiFetch.mockImplementation(
      async (path: string, { query }: { query?: Record<string, unknown> }) => {
        if (path !== '/discover') {
          return showOf(7);
        }
        return query?.with_status ? discoverPage() : discoverPage(7);
      },
    );
    const spot = await getNetworkSpotlight(49);
    expect(spot && 'id' in spot && spot.id).toBe(7);
  });
});
