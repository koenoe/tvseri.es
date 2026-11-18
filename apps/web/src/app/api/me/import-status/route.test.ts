import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchMe } from '@/auth/me';
import { getViewer } from '@/auth/viewer';
import { ApiError } from '@/lib/api/client';
import { revalidateViewerStats } from '@/lib/stats/revalidateViewerStats';

import { GET } from './route';

vi.mock('@/auth/viewer', () => ({ getViewer: vi.fn() }));
vi.mock('@/auth/me', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/auth/me')>()),
  fetchMe: vi.fn(),
}));
vi.mock('@/lib/stats/revalidateViewerStats', () => ({
  revalidateViewerStats: vi.fn(),
}));

const VIEWER = {
  accessToken: 'session-token',
  id: 'USER-SESSION',
  role: 'user',
} as const;
const IMPORT_ID = '0b2f4c1e-6f0e-4a55-8d57-3f2f9d3c8a11';
const lastImport = {
  createdAt: 1,
  importId: IMPORT_ID,
  undoneAt: 5,
  written: 3,
};

const get = (site = 'same-origin') =>
  GET(
    new NextRequest('https://www.tvseri.es/api/me/import-status', {
      headers: { 'sec-fetch-site': site },
    }),
    undefined,
  );

beforeEach(() => {
  vi.mocked(getViewer).mockReset().mockResolvedValue(VIEWER);
  vi.mocked(fetchMe).mockReset();
  vi.mocked(revalidateViewerStats).mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET /api/me/import-status', () => {
  it('reads the session user’s last import, never stored', async () => {
    vi.mocked(fetchMe).mockResolvedValue({ lastImport } as never);
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.json()).toEqual({ lastImport });
    expect(fetchMe).toHaveBeenCalledWith('session-token');
  });

  it('the queued Undo is done: the viewer’s stats refresh again', async () => {
    vi.mocked(fetchMe).mockResolvedValue({ lastImport } as never);
    await get();
    expect(revalidateViewerStats).toHaveBeenCalledWith(VIEWER.id);

    vi.mocked(revalidateViewerStats).mockReset();
    vi.mocked(fetchMe).mockResolvedValue({
      lastImport: { ...lastImport, undoneAt: undefined },
    } as never);
    await get();
    expect(revalidateViewerStats).not.toHaveBeenCalled();
  });

  it('no import yet: null', async () => {
    vi.mocked(fetchMe).mockResolvedValue({} as never);
    expect(await (await get()).json()).toEqual({ lastImport: null });
  });

  it('signed out, or a user the API doesn’t know: 401', async () => {
    vi.mocked(getViewer).mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    expect(fetchMe).not.toHaveBeenCalled();

    vi.mocked(getViewer).mockResolvedValue(VIEWER);
    vi.mocked(fetchMe).mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });

  it('an outage is a 502, never signed out', async () => {
    vi.mocked(fetchMe).mockRejectedValue(new ApiError(503));
    const res = await get();
    expect(res.status).toBe(502);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(revalidateViewerStats).not.toHaveBeenCalled();
  });

  it('refuses another site before reading the session', async () => {
    expect((await get('cross-site')).status).toBe(403);
    expect(getViewer).not.toHaveBeenCalled();
  });
});
