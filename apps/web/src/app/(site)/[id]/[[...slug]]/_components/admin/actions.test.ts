import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getViewer } from '@/auth/viewer';
import { ApiError, apiFetch } from '@/lib/api/client';

import {
  loadBackdropColours,
  resetPreferredImages,
  savePreferredImages,
} from './actions';

vi.mock('@/auth/viewer', () => ({ getViewer: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  updateTag: vi.fn(),
}));
vi.mock('@/lib/series/loaders', () => ({ loadSeries: vi.fn() }));

const { updateTag } = await import('next/cache');

const PICK = {
  backdropColor: '#585838',
  backdropImagePath: '/b1.jpg',
  titleTreatmentImagePath: '/l1.png',
};

const asAdmin = () =>
  vi
    .mocked(getViewer)
    .mockResolvedValue({ accessToken: 'token-a', id: 'u1', role: 'admin' });

beforeEach(() => {
  vi.mocked(apiFetch).mockResolvedValue({ message: 'OK' });
});

describe('savePreferredImages', () => {
  it('saves with the admin token, refreshes the show and Home at once and answers', async () => {
    asAdmin();
    const result = await savePreferredImages({ preferred: PICK, seriesId: 7 });
    expect(result).toMatchObject({ data: undefined, ok: true });
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith(
      '/admin/preferred-images/series/:id',
      { accessToken: 'token-a', body: PICK, method: 'PUT', params: { id: 7 } },
    );
    expect(vi.mocked(updateTag).mock.calls).toEqual([['series:7'], ['home']]);
  });

  it('refuses anyone but an admin, without calling the API', async () => {
    vi.mocked(getViewer).mockResolvedValue({
      accessToken: 'token-u',
      id: 'u2',
      role: 'user',
    });
    expect(await savePreferredImages({ preferred: PICK, seriesId: 7 })).toEqual(
      { error: 'unauthenticated', ok: false },
    );
    vi.mocked(getViewer).mockResolvedValue(null);
    expect(
      await savePreferredImages({ preferred: PICK, seriesId: 7 }),
    ).toMatchObject({ ok: false });
    expect(apiFetch).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('validates the pick: TMDB paths, a hex colour, a real id', async () => {
    asAdmin();
    const bad = [
      { preferred: { ...PICK, backdropImagePath: '../x' }, seriesId: 7 },
      { preferred: { ...PICK, backdropColor: 'red;}' }, seriesId: 7 },
      { preferred: PICK, seriesId: 0 },
    ];
    for (const input of bad) {
      expect(await savePreferredImages(input)).toEqual({
        error: 'invalid',
        ok: false,
      });
    }
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('reports a failed save instead of failing silently', async () => {
    asAdmin();
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(500));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await savePreferredImages({ preferred: PICK, seriesId: 7 })).toEqual(
      { error: 'failed', ok: false },
    );
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('resetPreferredImages', () => {
  it('deletes the saved pick for an admin and refreshes the show and Home', async () => {
    asAdmin();
    expect(await resetPreferredImages(7)).toMatchObject({
      data: undefined,
      ok: true,
    });
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith(
      '/admin/preferred-images/series/:id',
      { accessToken: 'token-a', method: 'DELETE', params: { id: 7 } },
    );
    expect(vi.mocked(updateTag).mock.calls).toEqual([['series:7'], ['home']]);
  });

  it('refuses anyone but an admin, and an invalid id, without calling the API', async () => {
    vi.mocked(getViewer).mockResolvedValue(null);
    expect(await resetPreferredImages(7)).toEqual({
      error: 'unauthenticated',
      ok: false,
    });
    asAdmin();
    expect(await resetPreferredImages(0)).toEqual({
      error: 'invalid',
      ok: false,
    });
    expect(apiFetch).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('reports a failed reset and refreshes nothing', async () => {
    asAdmin();
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(500));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await resetPreferredImages(7)).toEqual({
      error: 'failed',
      ok: false,
    });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('loadBackdropColours', () => {
  it('asks the API for the w780 image of each backdrop', async () => {
    asAdmin();
    vi.mocked(apiFetch).mockImplementation(async (_path, options) => ({
      hex: String(options?.query?.url).endsWith('/b1.jpg')
        ? '#585838'
        : '#111111',
    }));
    const result = await loadBackdropColours({
      paths: ['/b1.jpg', '/b2.jpg'],
      seriesId: 7,
    });
    expect(result).toMatchObject({
      data: { '/b1.jpg': '#585838', '/b2.jpg': '#111111' },
      ok: true,
    });
    expect(apiFetch).toHaveBeenCalledWith('/dominant-color', {
      query: { url: 'https://image.tmdb.org/t/p/w780/b1.jpg' },
    });
  });

  it('only takes TMDB image paths', async () => {
    asAdmin();
    expect(
      await loadBackdropColours({
        paths: ['https://evil.example.com/x.jpg'],
        seriesId: 7,
      }),
    ).toEqual({ error: 'invalid', ok: false });
  });
});
