import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch, getViewer, refresh } = vi.hoisted(() => ({
  apiFetch: vi.fn(async (): Promise<unknown> => ({})),
  getViewer: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/cache', () => ({ refresh }));
vi.mock('@/auth/viewer', () => ({ getViewer }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const { setFollowing } = await import('./follow');
const { ApiError } = await import('@/lib/api/client');

beforeEach(() => {
  vi.clearAllMocks();
  getViewer.mockResolvedValue({ accessToken: 'token', id: 'VIEWER01' });
});

describe('setFollowing', () => {
  it('follows and unfollows', async () => {
    await expect(setFollowing('01OWNER', true)).resolves.toEqual({ ok: true });
    await expect(setFollowing('01OWNER', false)).resolves.toEqual({ ok: true });
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/user/:id/follow', {
      accessToken: 'token',
      method: 'POST',
      params: { id: '01OWNER' },
    });
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/user/:id/unfollow', {
      accessToken: 'token',
      method: 'DELETE',
      params: { id: '01OWNER' },
    });
    // the counts and Follows you are read per request: show them again
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('refuses a signed-out request without calling the API', async () => {
    getViewer.mockResolvedValue(null);
    await expect(setFollowing('01OWNER', true)).resolves.toEqual({
      ok: false,
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('says so when the API refuses, and keeps the route as it was', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(403, 'Forbidden'));
    await expect(setFollowing('01OWNER', true)).resolves.toEqual({
      ok: false,
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([
    ['a following that is not a boolean', '01OWNER', 'false'],
    ['an empty id', '', true],
    ['a path segment', '..', true],
    ['an id with a slash', 'a/b', true],
    ['an id that is not a string', 42, true],
  ])('refuses %s without calling the API', async (_, userId, following) => {
    await expect(
      setFollowing(userId as string, following as boolean),
    ).resolves.toEqual({ ok: false });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('refuses following yourself', async () => {
    await expect(setFollowing('VIEWER01', true)).resolves.toEqual({
      ok: false,
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
