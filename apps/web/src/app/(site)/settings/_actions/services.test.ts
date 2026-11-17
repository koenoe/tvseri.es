import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getViewer } from '@/auth/viewer';
import { ApiError, apiFetch } from '@/lib/api/client';

import { updateCountry, updateWatchProviders } from './services';

vi.mock('@/auth/viewer', () => ({ getViewer: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));

const netflix = {
  id: 8,
  logo: 'https://image.tmdb.org/t/p/w92/netflix.jpg',
  logoPath: '/netflix.jpg',
  name: 'Netflix',
};

beforeEach(() => {
  vi.mocked(getViewer).mockResolvedValue({
    accessToken: 'token-rae',
    id: 'u-rae',
    role: 'user',
  });
  vi.mocked(apiFetch).mockResolvedValue({});
});

describe('updateCountry', () => {
  it('saves the country with the session token', async () => {
    expect(await updateCountry('NL')).toMatchObject({
      data: undefined,
      ok: true,
    });
    expect(apiFetch).toHaveBeenCalledWith('/me', {
      accessToken: 'token-rae',
      body: { country: 'NL' },
      method: 'PUT',
    });
  });

  it('validates the code before any request', async () => {
    for (const bad of ['nl', 'NLD', '', 'N1']) {
      expect(await updateCountry(bad)).toEqual({ error: 'invalid', ok: false });
    }
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('answers signed out and failures without leaking the API text', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(getViewer).mockResolvedValueOnce(null);
    expect(await updateCountry('NL')).toEqual({
      error: 'unauthenticated',
      ok: false,
    });
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(500, 'secret'));
    expect(await updateCountry('NL')).toEqual({ error: 'failed', ok: false });
  });
});

describe('updateWatchProviders', () => {
  it('saves the whole list with the session token', async () => {
    expect(
      await updateWatchProviders({ watchProviders: [netflix] }),
    ).toMatchObject({
      data: undefined,
      ok: true,
    });
    expect(apiFetch).toHaveBeenCalledWith('/me/watch-providers', {
      accessToken: 'token-rae',
      // The API builds the logo from logoPath, so it isn't sent
      body: {
        watchProviders: [{ id: 8, logoPath: '/netflix.jpg', name: 'Netflix' }],
      },
      method: 'PUT',
    });
  });

  it('validates the list, and sends no input user id on', async () => {
    expect(
      await updateWatchProviders({ watchProviders: [{ id: 'x' }] } as never),
    ).toEqual({ error: 'invalid', ok: false });

    await updateWatchProviders({
      userId: 'u-someone-else',
      watchProviders: [],
    } as never);
    expect(JSON.stringify(vi.mocked(apiFetch).mock.calls)).not.toContain(
      'u-someone-else',
    );
  });

  it('answers signed out without a request', async () => {
    vi.mocked(getViewer).mockResolvedValue(null);
    expect(await updateWatchProviders({ watchProviders: [] })).toEqual({
      error: 'unauthenticated',
      ok: false,
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
