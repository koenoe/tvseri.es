import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A forged display cookie (`__tvseries_user`) naming someone else: the
 * cookie may start the viewer's own reads early, never decide whose data a
 * profile shows. The profile helpers run for real here; only the API, the
 * session and the cookie are doubles.
 */

const { apiFetch, auth, getViewer, cookie } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  auth: vi.fn(),
  cookie: { value: undefined as string | undefined },
  getViewer: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ default: () => auth() }));
vi.mock('@/auth/viewer', () => ({ getViewer: () => getViewer() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    // The request's `Cookie` string, values URI-encoded like Next's store
    toString: () =>
      cookie.value === undefined
        ? ''
        : `__tvseries_user=${encodeURIComponent(cookie.value)}`,
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
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const { getProfile } = await import('./profile');
const { loadOverview } = await import('./overview');
const { loadViewerLibrary } = await import('./library');
const { libraryRead, settleGuess } = await import('./libraryRead');

/** The viewer: alex, signed in with their own token */
const ALEX = {
  createdAt: '2024-01-01T00:00:00.000Z',
  email: 'alex@example.com',
  id: 'u-alex',
  role: 'user',
  username: 'alex',
  watchProviders: [],
};
/** The profile the forged cookie names */
const JUNO_PUBLIC = {
  createdAt: '2024-02-02T00:00:00.000Z',
  id: 'u-juno',
  username: 'juno',
  watchProviders: [],
};

const params = Promise.resolve({ username: 'juno' });
const paths = () => apiFetch.mock.calls.map(([path]) => path as string);

beforeEach(() => {
  apiFetch.mockReset();
  auth.mockReset();
  getViewer.mockResolvedValue({
    accessToken: 'alex-token',
    id: 'u-alex',
    role: 'user',
  });
  auth.mockResolvedValue({ accessToken: 'alex-token', user: ALEX });
  apiFetch.mockImplementation(async (path: string) => {
    if (path === '/user/by-username/:username') {
      return JUNO_PUBLIC;
    }
    return {};
  });
  cookie.value = 'juno';
});

describe('a forged display cookie naming another user', () => {
  it('leaves the visitor a visitor, with only the public identity', async () => {
    const profile = await getProfile(params);

    expect(profile.viewer).toBe('visitor');
    expect(profile.user).toEqual(JUNO_PUBLIC);
    // the early read the cookie started is the viewer's own account
    expect(auth).toHaveBeenCalled();
    expect(profile.accessToken).toBe('alex-token');
  });

  it('reads no `/me` route as the profile’s owner: every private read is the viewer’s own token', async () => {
    const profile = await getProfile(params);
    await loadOverview(profile);
    await loadViewerLibrary(profile);

    expect(paths()).toContain('/user/:id/overview');
    expect(paths()).not.toContain('/me/overview');
    const overview = apiFetch.mock.calls.find(
      ([path]) => path === '/user/:id/overview',
    );
    expect(overview?.[1]).toMatchObject({
      accessToken: 'alex-token',
      params: { id: 'u-juno' },
    });
    // `/me/library-ids` is alex's own library ("New to you"), with alex's token
    expect(paths()).toContain('/me/library-ids');
    for (const [path, options] of apiFetch.mock.calls) {
      if (String(path).startsWith('/me/')) {
        expect(options).toMatchObject({ accessToken: 'alex-token' });
      }
    }
  });

  it('only guesses the Library’s viewer: the read still carries the viewer’s token', async () => {
    const start = await libraryRead(params);

    expect(start?.guess).toBe('owner');
    expect(start?.read).toEqual({
      accessToken: 'alex-token',
      userId: '@juno',
    });
  });

  it('drops the Library read made on the guess and reads again as the verified visitor', async () => {
    const start = await libraryRead(params);
    if (!start) {
      throw new Error('signed in');
    }
    const readAs = vi.fn(async (viewer: string) => `shelf read as ${viewer}`);

    const settled = await settleGuess(
      start.guess,
      getProfile(params),
      readAs(start.guess),
      readAs,
    );

    expect(settled.profile.viewer).toBe('visitor');
    expect(settled.value).toBe('shelf read as visitor');
    expect(readAs.mock.calls.map(([viewer]) => viewer)).toEqual([
      'owner',
      'visitor',
    ]);
  });

  it('ignores a guessed read that failed when the guess was wrong', async () => {
    const settled = await settleGuess<string>(
      'owner',
      getProfile(params),
      Promise.reject(new Error('403')),
      async (viewer) => viewer,
    );
    expect(settled.value).toBe('visitor');
  });
});

describe('a forged display cookie on a signed-out request', () => {
  it('is the 401, reading only the public lookup and no account', async () => {
    getViewer.mockResolvedValue(null);

    await expect(getProfile(params)).rejects.toThrow('UNAUTHORIZED');
    expect(auth).not.toHaveBeenCalled();
    expect(paths()).toEqual(['/user/by-username/:username']);
  });
});

describe('a display cookie that names the viewer', () => {
  it('keeps the read made on the guess: no second read', async () => {
    cookie.value = 'alex';
    apiFetch.mockImplementation(async (path: string) =>
      path === '/user/by-username/:username' ? null : {},
    );
    const own = Promise.resolve({ username: 'alex' });
    const readAs = vi.fn(async (viewer: string) => viewer);

    const settled = await settleGuess(
      'owner',
      getProfile(own),
      Promise.resolve('guessed'),
      readAs,
    );

    expect(settled.profile.viewer).toBe('owner');
    expect(settled.value).toBe('guessed');
    expect(readAs).not.toHaveBeenCalled();
  });
});
