import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getViewer } from '@/auth/viewer';
import { apiFetch } from '@/lib/api/client';
import { revalidateViewerStats } from '@/lib/stats/revalidateViewerStats';

import { GET } from './route';

vi.mock('@/auth/viewer', () => ({ getViewer: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));
vi.mock('@/lib/stats/revalidateViewerStats', () => ({
  revalidateViewerStats: vi.fn(),
}));

const VIEWER = {
  accessToken: 'session-token',
  id: 'USER-SESSION',
  role: 'user',
} as const;
const NOW = Date.UTC(2026, 10, 21, 12);
const MINUTE = 60_000;

const sync = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  error: null,
  films: 0,
  finishedAt: NOW - MINUTE,
  requestedAt: NOW - 2 * MINUTE,
  skipped: 0,
  stalled: false,
  state: 'ok',
  unresolved: 0,
  unresolvedOverflow: 0,
  written: 12,
  ...overrides,
});

const status = (run: ReturnType<typeof sync> | null) => ({
  connected: true,
  lastSyncedAt: run?.finishedAt ?? null,
  latest: null,
  profileName: 'Sam',
  recent: [],
  resumeFrom: null,
  status: 'ok',
  sync: run,
  total: null,
  unresolvedCount: 0,
  week: [],
});

const get = (service = 'netflix') =>
  GET(
    new NextRequest(`https://www.tvseri.es/api/connections/${service}`, {
      headers: { 'sec-fetch-site': 'same-origin' },
    }),
    { params: Promise.resolve({ service }) },
  );

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  vi.mocked(getViewer).mockReset().mockResolvedValue(VIEWER);
  vi.mocked(apiFetch).mockReset();
  vi.mocked(revalidateViewerStats).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/connections/:service', () => {
  it('answers the card’s status, never stored', async () => {
    vi.mocked(apiFetch).mockResolvedValue(status(sync()));
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.json()).toMatchObject({ sync: { written: 12 } });
  });

  it('a sync that wrote episodes just ended: the viewer’s stats refresh', async () => {
    vi.mocked(apiFetch).mockResolvedValue(status(sync()));
    await get();
    expect(revalidateViewerStats).toHaveBeenCalledWith(VIEWER.id);
  });

  it('a failed sync that wrote some before it stopped refreshes them too', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      status(sync({ error: 'rate-limited', state: 'failed' })),
    );
    await get();
    expect(revalidateViewerStats).toHaveBeenCalledWith(VIEWER.id);
  });

  it.each([
    ['still running', sync({ finishedAt: null, state: 'running' })],
    ['wrote nothing', sync({ written: 0 })],
    [
      'ended long ago (a pairing poll)',
      sync({ finishedAt: NOW - 61 * MINUTE }),
    ],
    ['never synced', null],
  ])('leaves the stats alone for a sync %s', async (_, run) => {
    vi.mocked(apiFetch).mockResolvedValue(status(run));
    await get();
    expect(revalidateViewerStats).not.toHaveBeenCalled();
  });

  it('is a 404 for a service it can’t connect, without calling the API', async () => {
    const res = await get('hulu');
    expect(res.status).toBe(404);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
