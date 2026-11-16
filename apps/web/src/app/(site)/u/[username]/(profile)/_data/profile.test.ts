import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProfile } from './profile';

const getViewer = vi.fn();
const auth = vi.fn();
const loadProfileUser = vi.fn();
const resolveProfileUser = vi.fn();
/** The display cookie's username (`__tvseries_user`), or none */
let displayed: string | undefined;

vi.mock('@/auth', () => ({ default: () => auth() }));
vi.mock('@/auth/viewer', () => ({ getViewer: () => getViewer() }));
vi.mock('@/lib/profile/user', () => ({
  loadProfileUser: (...args: unknown[]) => loadProfileUser(...args),
  resolveProfileUser: (...args: unknown[]) => resolveProfileUser(...args),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => (displayed === undefined ? undefined : { value: displayed }),
  }),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
  unauthorized: () => {
    throw new Error('UNAUTHORIZED');
  },
}));

const params = (username: string) => Promise.resolve({ username });
const viewer = (id: string) => ({ accessToken: 'token', id, role: 'user' });
const juno = {
  createdAt: '',
  id: 'u-juno',
  username: 'juno',
  watchProviders: [],
};

beforeEach(() => {
  loadProfileUser.mockReset();
  resolveProfileUser.mockReset();
  auth.mockReset();
  displayed = undefined;
});

describe('getProfile (every profile for signed-in users only)', () => {
  it('is the 401 signed out for a user who exists', async () => {
    getViewer.mockResolvedValue(null);
    loadProfileUser.mockResolvedValue(juno);
    await expect(getProfile(params('juno'))).rejects.toThrow('UNAUTHORIZED');
  });

  it('is the 404 signed out for a handle nobody has (not "sign in to see")', async () => {
    getViewer.mockResolvedValue(null);
    loadProfileUser.mockResolvedValue(null);
    await expect(getProfile(params('nobody'))).rejects.toThrow('NOT_FOUND');
    // one read, the one the page's metadata makes too (memoised per render)
    expect(loadProfileUser).toHaveBeenCalledTimes(1);
  });

  it('keeps the 401 signed out when the profile read fails', async () => {
    getViewer.mockResolvedValue(null);
    loadProfileUser.mockRejectedValue(new Error('timeout'));
    await expect(getProfile(params('juno'))).rejects.toThrow('UNAUTHORIZED');
  });

  it('is the 404 for an unknown user', async () => {
    getViewer.mockResolvedValue(viewer('u-alex'));
    resolveProfileUser.mockResolvedValue(null);
    await expect(getProfile(params('nobody'))).rejects.toThrow('NOT_FOUND');
  });

  it('knows your own profile from someone else’s', async () => {
    getViewer.mockResolvedValue(viewer('u-juno'));
    resolveProfileUser.mockResolvedValue({ isOwner: true, user: juno });
    expect((await getProfile(params('juno'))).viewer).toBe('owner');
    getViewer.mockResolvedValue(viewer('u-alex'));
    resolveProfileUser.mockResolvedValue({ isOwner: false, user: juno });
    expect((await getProfile(params('juno'))).viewer).toBe('visitor');
  });

  it('resolves the profile for the verified viewer, their own from their account', async () => {
    getViewer.mockResolvedValue(viewer('u-alex'));
    resolveProfileUser.mockResolvedValue({ isOwner: false, user: juno });
    expect(await getProfile(params('juno'))).toMatchObject({
      accessToken: 'token',
      viewerId: 'u-alex',
    });
    const [username, viewerId, loadOwnUser] =
      resolveProfileUser.mock.calls[0] ?? [];
    expect([username, viewerId]).toEqual(['juno', 'u-alex']);
    // the account read is the viewer's `auth()`, made only when asked
    expect(auth).not.toHaveBeenCalled();
    auth.mockResolvedValue({ user: { ...juno, id: 'u-alex' } });
    await expect(loadOwnUser()).resolves.toMatchObject({ id: 'u-alex' });
  });

  it('starts your own account read beside the lookup when the display cookie names you', async () => {
    getViewer.mockResolvedValue(viewer('u-juno'));
    auth.mockResolvedValue({ user: juno });
    displayed = 'Juno';
    resolveProfileUser.mockImplementation(async () => {
      // the warm-up ran before the lookup was awaited
      expect(auth).toHaveBeenCalledTimes(1);
      return { isOwner: true, user: juno };
    });
    expect((await getProfile(params('juno'))).viewer).toBe('owner');
  });

  it('reads no account for a visitor, and a wrong guess changes nothing', async () => {
    getViewer.mockResolvedValue(viewer('u-alex'));
    resolveProfileUser.mockResolvedValue({ isOwner: false, user: juno });
    displayed = 'alex';
    expect((await getProfile(params('juno'))).viewer).toBe('visitor');
    expect(auth).not.toHaveBeenCalled();
    // the cookie is a hint only: naming the profile never makes you its owner
    displayed = 'juno';
    auth.mockRejectedValue(new Error('down'));
    expect((await getProfile(params('juno'))).viewer).toBe('visitor');
  });
});
