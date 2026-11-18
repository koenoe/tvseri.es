import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/auth', () => ({ default: vi.fn() }));

const { loadGetStartedStatus } = await import('./loadGetStarted');

const PROFILE = {
  accessToken: 'token',
  user: { id: 'user-1' },
  viewer: 'owner',
  viewerId: 'user-1',
} as Parameters<typeof loadGetStartedStatus>[0];

const NEW = {
  doneAt: null,
  doneCount: 0,
  hidden: false,
  steps: { alreadySeen: false, history: false, services: false },
};

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

describe('loadGetStartedStatus', () => {
  it('reads the status', async () => {
    answer(NEW);
    await expect(loadGetStartedStatus(PROFILE)).resolves.toEqual(NEW);
  });

  it('an answer without its steps is a failed read: no block, never a crash', async () => {
    answer({ hidden: false });
    await expect(loadGetStartedStatus(PROFILE)).resolves.toBeNull();
  });
});
