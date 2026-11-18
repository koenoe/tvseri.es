import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getViewer } from '@/auth/viewer';
import { ApiError, apiFetch } from '@/lib/api/client';
import { loadSeries } from '@/lib/series/loaders';

import { GET } from './route';

vi.mock('@/auth/viewer', () => ({ getViewer: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));
vi.mock('@/lib/series/loaders', () => ({ loadSeries: vi.fn() }));

const IMAGES = { automatic: {}, backdrops: [], preferred: null, titles: [] };

const get = (id: string, site = 'same-origin') =>
  GET(
    new NextRequest(`https://www.tvseri.es/api/admin/series/${id}/images`, {
      headers: { 'sec-fetch-site': site },
    }),
    { params: Promise.resolve({ id }) },
  );

const as = (role: 'admin' | 'user') =>
  vi
    .mocked(getViewer)
    .mockResolvedValue({ accessToken: 'token-a', id: 'u1', role });

beforeEach(() => {
  vi.mocked(getViewer).mockReset();
  vi.mocked(apiFetch).mockReset().mockResolvedValue(IMAGES);
  vi.mocked(loadSeries)
    .mockReset()
    .mockResolvedValue({ id: 7, originalLanguage: 'ko' } as never);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  as('admin');
});

describe('GET /api/admin/series/:id/images', () => {
  it('reads the choices in the show’s language for an admin, never stored', async () => {
    const res = await get('7');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.json()).toEqual(IMAGES);
    expect(apiFetch).toHaveBeenCalledWith('/series/:id/images', {
      notFound: 'null',
      params: { id: 7 },
      query: { language: 'ko' },
    });
  });

  it('is 403 for a viewer who isn’t an admin and 401 signed out, without a read', async () => {
    as('user');
    expect((await get('7')).status).toBe(403);
    vi.mocked(getViewer).mockResolvedValue(null);
    expect((await get('7')).status).toBe(401);
    expect(loadSeries).not.toHaveBeenCalled();
  });

  it('refuses another site', async () => {
    expect((await get('7', 'cross-site')).status).toBe(403);
    expect(getViewer).not.toHaveBeenCalled();
  });

  it.each(['0', 'abc', '-1'])(
    'is 404 for the id %s, without a read',
    async (id) => {
      expect((await get(id)).status).toBe(404);
      expect(loadSeries).not.toHaveBeenCalled();
    },
  );

  it('is 404 for a show nobody knows, or one without images', async () => {
    vi.mocked(loadSeries).mockResolvedValueOnce(null);
    expect((await get('7')).status).toBe(404);
    vi.mocked(apiFetch).mockResolvedValueOnce(null);
    expect((await get('7')).status).toBe(404);
  });

  it('an outage is an uncached 502', async () => {
    vi.mocked(loadSeries).mockResolvedValueOnce({ unavailable: true });
    expect((await get('7')).status).toBe(502);
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(503));
    const res = await get('7');
    expect(res.status).toBe(502);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });
});
