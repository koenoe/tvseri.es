import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

const { getViewer } = vi.hoisted(() => ({ getViewer: vi.fn() }));
vi.mock('@/auth/viewer', () => ({ getViewer }));

const { isTmdbId, viewerRoute } = await import('./handlers');

const VIEWER = { accessToken: 'token', id: 'user-1', role: 'user' };
const REQ = new NextRequest('https://www.tvseri.es/api/me/thing');
const CONTEXT = { params: Promise.resolve({}) };

const PRIVATE = 'private, no-store';

beforeEach(() => {
  getViewer.mockResolvedValue(VIEWER);
});

describe('viewerRoute', () => {
  it('hands the verified viewer to the handler, and keeps the answer private', async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const res = await viewerRoute(handler)(REQ, CONTEXT);
    expect(handler).toHaveBeenCalledWith(VIEWER, REQ, CONTEXT);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(PRIVATE);
  });

  it('answers 401 signed out, without running the handler', async () => {
    getViewer.mockResolvedValue(null);
    const handler = vi.fn();
    const res = await viewerRoute(handler)(REQ, CONTEXT);
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
    expect(res.headers.get('cache-control')).toBe(PRIVATE);
  });

  it.each([
    [new ApiError(401, 'AccountGone'), 401, 'AccountGone'],
    [new ApiError(401), 401, 'Unauthorized'],
    [new ApiError(503), 502, 'Failed'],
    [new ApiError(0, 'ApiTimeout'), 502, 'Failed'],
    [new Error('bug'), 502, 'Failed'],
  ])('maps a failed read (%s) to %i %s', async (error, status, code) => {
    const res = await viewerRoute(async () => {
      throw error;
    })(REQ, CONTEXT);
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error: code });
    expect(res.headers.get('cache-control')).toBe(PRIVATE);
  });

  it('makes even a handler’s own answer private', async () => {
    const res = await viewerRoute(async () =>
      Response.json({}, { headers: { 'Cache-Control': 'public, max-age=60' } }),
    )(REQ, CONTEXT);
    expect(res.headers.get('cache-control')).toBe(PRIVATE);
  });
});

describe('isTmdbId', () => {
  it.each(['1', '136315', '99999999'])('takes %s', (id) => {
    expect(isTmdbId(id)).toBe(true);
  });

  it.each(['0', '01', '-1', '1.5', 'abc', '', '123456789'])(
    'refuses %s',
    (id) => {
      expect(isTmdbId(id)).toBe(false);
    },
  );
});
