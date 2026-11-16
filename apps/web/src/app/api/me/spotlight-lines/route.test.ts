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

const call = (search = '') =>
  GET(
    new NextRequest(`http://localhost/api/me/spotlight-lines${search}`),
    undefined,
  );

beforeEach(() => {
  getViewer.mockReset();
  apiFetch.mockReset();
});

describe('GET /api/me/spotlight-lines', () => {
  it('is 401 signed out, and never stored', async () => {
    getViewer.mockResolvedValue(null);
    const response = await call();
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('answers with the viewer’s lines, never stored in the browser (one URL for every account)', async () => {
    getViewer.mockResolvedValue({
      accessToken: 'token-a',
      id: 'a',
      role: 'user',
    });
    apiFetch.mockResolvedValue({ lines: { '1': null } });
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ lines: { '1': null } });
    expect(apiFetch).toHaveBeenCalledWith('/me/home/spotlight-lines', {
      accessToken: 'token-a',
    });
  });

  it('passes no ids on to the API, whatever the URL says', async () => {
    getViewer.mockResolvedValue({
      accessToken: 'token-a',
      id: 'a',
      role: 'user',
    });
    apiFetch.mockResolvedValue({ lines: {} });
    await call('?ids=1,2,3');
    expect(apiFetch).toHaveBeenCalledWith('/me/home/spotlight-lines', {
      accessToken: 'token-a',
    });
  });

  it('is 401 when the API refuses the token, 502 on other failures', async () => {
    getViewer.mockResolvedValue({
      accessToken: 'token-a',
      id: 'a',
      role: 'user',
    });
    apiFetch.mockRejectedValueOnce(new ApiError(401));
    expect((await call()).status).toBe(401);
    apiFetch.mockRejectedValueOnce(new ApiError(500));
    expect((await call()).status).toBe(502);
  });
});
