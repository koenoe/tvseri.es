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
const { getThemeSpotlight } = await import('./rows');

describe('theme loaders when the API fails', () => {
  it('passes a failed pick on with a short life', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    await expect(getThemeSpotlight('dystopia')).resolves.toEqual(UNAVAILABLE);
    expect(ownLife(3)).toBe('unavailable');
  });

  it('caches “no rated show” as a real answer', async () => {
    apiFetch.mockResolvedValue(discoverPage());
    await expect(getThemeSpotlight('dystopia')).resolves.toBeNull();
    expect(ownLife(3)).toBe('medium');
  });
});

describe('the theme spotlight’s logo', () => {
  it('carries the show’s title treatment from /series/:id', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/discover') return discoverPage(7);
      if (path === '/series/summaries') return {};
      if (path === '/series/:id')
        return { id: 7, titleTreatmentImage: 'logo-7.png' };
      throw new Error(path);
    });
    const spotlight = await getThemeSpotlight('dystopia');
    expect(spotlight && 'show' in spotlight && spotlight.show.logo).toBe(
      'logo-7.png',
    );
  });

  it('has no logo when the show has none, or TMDB doesn’t know it', async () => {
    apiFetch.mockImplementation(async (path: string) =>
      path === '/discover'
        ? discoverPage(7)
        : path === '/series/:id'
          ? null
          : {},
    );
    const spotlight = await getThemeSpotlight('dystopia');
    expect(spotlight && 'show' in spotlight && spotlight.show.logo).toBeNull();
  });
});
