import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch, session } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  session: { release: (): void => undefined },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/api/client', () => ({ apiFetch }));
vi.mock('@/lib/geo', () => ({ resolveRegion: async () => 'GB' }));
vi.mock('../../_data/watchProviders', () => ({
  loadRegionProviders: async () => [{ logo: '/n.png', name: 'Netflix' }],
}));
vi.mock('../../_data/session', () => ({
  getSettingsSession: () =>
    new Promise((resolve) => {
      session.release = () =>
        resolve({
          accessToken: 'token',
          user: { id: 'u1', lastImport: null, username: 'rae' },
        });
    }),
  getSettingsViewer: async () => ({
    accessToken: 'token',
    id: 'u1',
    role: 'user',
  }),
}));

const { loadImporter } = await import('./importer');

beforeEach(() => {
  apiFetch.mockReset().mockImplementation(async (_path, { params }) => ({
    items: [{ posterImage: `/${params.list}.jpg` }],
  }));
});

describe('loadImporter', () => {
  it('reads the poster wall beside the account read, not after it', async () => {
    const loaded = loadImporter();
    // the account read (`GET /me`) is still out
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    session.release();
    expect(await loaded).toEqual({
      lastImport: null,
      posters: ['/watched.jpg', '/in_progress.jpg'],
      providers: [{ logo: '/n.png', name: 'Netflix' }],
      username: 'rae',
    });
  });
});
