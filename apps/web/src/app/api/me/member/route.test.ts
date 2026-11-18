import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getViewer = vi.fn();
vi.mock('@/auth/viewer', () => ({ getViewer }));

class ApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`API ${status}`);
    this.status = status;
  }
}
const apiFetch = vi.fn();
vi.mock('@/lib/api/client', () => ({ ApiError, apiFetch }));

const { GET } = await import('./route');

const call = (handle?: string) =>
  GET(
    new NextRequest(
      handle === undefined
        ? 'http://localhost/api/me/member'
        : `http://localhost/api/me/member?handle=${encodeURIComponent(handle)}`,
    ),
    undefined,
  );

const VIEWER = { accessToken: 'token-a', id: 'a', role: 'user' };

beforeEach(() => {
  getViewer.mockReset();
  apiFetch.mockReset();
});

describe('GET /api/me/member', () => {
  it('is 401 signed out, asks nothing and is never stored', async () => {
    getViewer.mockResolvedValue(null);
    const response = await call('juno-tv');
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('answers the member for an exact handle, as stored, never kept by the browser', async () => {
    getViewer.mockResolvedValue(VIEWER);
    apiFetch.mockResolvedValue({ id: 'B', username: 'juno-tv' });
    const response = await call('@Juno-TV');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      member: { id: 'B', username: 'juno-tv' },
    });
    expect(apiFetch).toHaveBeenCalledWith('/me/member', {
      accessToken: 'token-a',
      notFound: 'null',
      query: { username: 'juno-tv' },
      schema: expect.anything(),
    });
  });

  it('answers no member when nobody has that handle', async () => {
    getViewer.mockResolvedValue(VIEWER);
    apiFetch.mockResolvedValue(null);
    const response = await call('nobody-here');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ member: null });
  });

  it.each([undefined, '', '@', 'two words', 'a'.repeat(31)])(
    'is 400 for %j, without asking the API',
    async (handle) => {
      getViewer.mockResolvedValue(VIEWER);
      const response = await call(handle);
      expect(response.status).toBe(400);
      expect(apiFetch).not.toHaveBeenCalled();
    },
  );

  it('is 401 when the API refuses the token, 502 on other failures', async () => {
    getViewer.mockResolvedValue(VIEWER);
    apiFetch.mockRejectedValueOnce(new ApiError(401));
    expect((await call('juno-tv')).status).toBe(401);
    apiFetch.mockRejectedValueOnce(new ApiError(500));
    expect((await call('juno-tv')).status).toBe(502);
  });
});
