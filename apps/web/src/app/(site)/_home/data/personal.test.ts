import { beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, tokenViewer } = vi.hoisted(() => ({
  auth: vi.fn(),
  tokenViewer: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/auth', () => ({ default: auth }));
vi.mock('@/auth/viewer', () => ({ getViewer: tokenViewer }));

const { getGetStarted, readAsViewer } = await import('./personal');

const SESSION = { accessToken: 'token', user: { id: 'user-1' } };

beforeEach(() => {
  vi.clearAllMocks();
  tokenViewer.mockResolvedValue({ accessToken: 'token', id: 'user-1' });
});

describe('readAsViewer', () => {
  it('starts the read from the token while GET /me is on its way', async () => {
    let resolveSession: (value: unknown) => void = () => {};
    auth.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    const read = vi.fn(async () => 'row');
    const result = readAsViewer(read);
    await vi.waitFor(() => expect(read).toHaveBeenCalledWith('token'));
    resolveSession(SESSION);
    await expect(result).resolves.toBe('row');
  });

  it('reads nothing signed out', async () => {
    tokenViewer.mockResolvedValue(null);
    auth.mockResolvedValue({});
    const read = vi.fn();
    await expect(readAsViewer(read)).resolves.toBeNull();
    expect(read).not.toHaveBeenCalled();
  });

  it('fails when the profile fails, so the row shows its failed state', async () => {
    auth.mockResolvedValue({});
    await expect(readAsViewer(async () => 'row')).rejects.toThrow(
      'The signed-in viewer could not be read',
    );
  });
});

describe('getGetStarted', () => {
  const NEW = {
    doneAt: null,
    doneCount: 0,
    hidden: false,
    steps: { alreadySeen: false, history: false, services: false },
  };
  const session = {
    accessToken: 'token',
    user: { createdAt: new Date().toISOString(), id: 'user-1' },
  } as Parameters<typeof getGetStarted>[0];
  const answer = (body: unknown) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(body)),
    );

  beforeEach(() => {
    vi.stubEnv('API_URL', 'https://api.test');
    vi.stubEnv('API_KEY', 'key');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reads a new user’s status', async () => {
    answer(NEW);
    await expect(getGetStarted(session)).resolves.toEqual(NEW);
  });

  it('an answer without its steps fails like any failed read (the slot’s failed state), never a half status', async () => {
    answer({ hidden: false });
    await expect(getGetStarted(session)).rejects.toMatchObject({
      code: 'ApiInvalidResponse',
      name: 'ApiError',
    });
  });
});
