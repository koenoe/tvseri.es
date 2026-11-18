import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getViewer } from '@/auth/viewer';
import { ApiError, apiFetch } from '@/lib/api/client';

import { GET } from './route';

vi.mock('@/auth/viewer', () => ({ getViewer: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));

const get = (id: string, paths: ReadonlyArray<string>, site = 'same-origin') =>
  GET(
    new NextRequest(
      `https://www.tvseri.es/api/admin/series/${id}/backdrop-colours?${new URLSearchParams(paths.map((path) => ['path', path]))}`,
      { headers: { 'sec-fetch-site': site } },
    ),
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  vi.mocked(getViewer)
    .mockReset()
    .mockResolvedValue({ accessToken: 'token-a', id: 'u1', role: 'admin' });
  vi.mocked(apiFetch)
    .mockReset()
    .mockImplementation(async (_path, options) => ({
      hex: String(options?.query?.url).endsWith('/b1.jpg')
        ? '#585838'
        : '#111111',
    }));
});

describe('GET /api/admin/series/:id/backdrop-colours', () => {
  it('asks the API for the w780 image of each backdrop, never stored', async () => {
    const res = await get('7', ['/b1.jpg', '/b2.jpg']);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.json()).toEqual({
      '/b1.jpg': '#585838',
      '/b2.jpg': '#111111',
    });
    expect(apiFetch).toHaveBeenCalledWith('/dominant-color', {
      query: { url: 'https://image.tmdb.org/t/p/w780/b1.jpg' },
    });
  });

  it('answers the colours it could read, and a 502 when none', async () => {
    vi.mocked(apiFetch)
      .mockRejectedValueOnce(new ApiError(503))
      .mockResolvedValueOnce({ hex: '#222222' });
    expect(await (await get('7', ['/b1.jpg', '/b2.jpg'])).json()).toEqual({
      '/b2.jpg': '#222222',
    });

    vi.mocked(apiFetch).mockRejectedValue(new ApiError(503));
    expect((await get('7', ['/b1.jpg'])).status).toBe(502);
  });

  it.each([
    [['https://evil.example.com/x.jpg']],
    [['../x.jpg']],
    [[]],
    [Array.from({ length: 9 }, (_, i) => `/b${i}.jpg`)],
  ])('is 400 for the paths %j, without asking the API', async (paths) => {
    expect((await get('7', paths)).status).toBe(400);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('is 404 for a malformed id', async () => {
    expect((await get('x', ['/b1.jpg'])).status).toBe(404);
  });

  it('admins only, from this site only', async () => {
    vi.mocked(getViewer).mockResolvedValue({
      accessToken: 'token-u',
      id: 'u2',
      role: 'user',
    });
    expect((await get('7', ['/b1.jpg'])).status).toBe(403);
    vi.mocked(getViewer).mockResolvedValue(null);
    expect((await get('7', ['/b1.jpg'])).status).toBe(401);
    expect((await get('7', ['/b1.jpg'], 'cross-site')).status).toBe(403);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
