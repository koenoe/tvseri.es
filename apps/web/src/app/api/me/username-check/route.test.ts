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

const check = (username?: string, site = 'same-origin') =>
  GET(
    new NextRequest(
      username === undefined
        ? 'https://www.tvseri.es/api/me/username-check'
        : `https://www.tvseri.es/api/me/username-check?username=${encodeURIComponent(username)}`,
      { headers: { 'sec-fetch-site': site } },
    ),
    undefined,
  );

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  vi.mocked(getViewer).mockReset().mockResolvedValue({
    accessToken: 'token-rae',
    id: 'u-rae',
    role: 'user',
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET /api/me/username-check', () => {
  it('is available when the lookup finds nobody, never stored', async () => {
    vi.mocked(apiFetch).mockResolvedValue(null);
    const res = await check('rae-fox');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.json()).toEqual({ status: 'available' });
    expect(apiFetch).toHaveBeenCalledWith(
      '/user/by-username/:username',
      expect.objectContaining({
        notFound: 'null',
        params: { username: 'rae-fox' },
      }),
    );
  });

  it('is taken when somebody else has it, available when it is the viewer', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ id: 'u-margaux' });
    expect(await (await check('margaux')).json()).toEqual({ status: 'taken' });

    vi.mocked(apiFetch).mockResolvedValueOnce({ id: 'u-rae' });
    expect(await (await check('rae')).json()).toEqual({ status: 'available' });
  });

  it.each([undefined, '', 'No Good', 'a/b'])(
    'is 400 for %j, without asking the API',
    async (username) => {
      expect((await check(username)).status).toBe(400);
      expect(apiFetch).not.toHaveBeenCalled();
    },
  );

  it('is 401 signed out, without asking the API', async () => {
    vi.mocked(getViewer).mockResolvedValue(null);
    expect((await check('rae-fox')).status).toBe(401);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('an outage is a 502, never an answer', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(503));
    expect((await check('rae-fox')).status).toBe(502);
  });

  it('refuses another site before reading the session', async () => {
    expect((await check('rae-fox', 'cross-site')).status).toBe(403);
    expect(getViewer).not.toHaveBeenCalled();
  });
});
