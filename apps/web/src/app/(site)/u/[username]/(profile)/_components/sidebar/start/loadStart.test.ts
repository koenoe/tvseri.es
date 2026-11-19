import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch, loadSeriesOrNull, saved } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  loadSeriesOrNull: vi.fn(),
  saved: { ids: [] as number[] },
}));

vi.mock('server-only', () => ({}));
// the owner's overview sends their region
vi.mock('@/auth', () => ({ default: async () => ({ user: null }) }));
vi.mock('@/lib/geo', () => ({ resolveRegion: async () => 'GB' }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));
vi.mock('@/lib/series/loaders', () => ({
  loadSeason: async () => null,
  loadSeriesOrNull,
}));

const show = (id: number) => ({
  id,
  network: { logo: `/n${id}.png`, name: `N${id}` },
  numberOfSeasons: 1,
  posterImage: `/p${id}.jpg`,
  slug: `s${id}`,
  status: 'Ended',
  title: `Show ${id}`,
});

vi.mock('../../../_data/trending', () => ({
  loadTrending: async () => [1, 2, 3, 4, 5].map(show),
}));

const { loadStartDeck } = await import('./loadStart');

const OWNER = {
  accessToken: 'token',
  user: { id: 'u1', username: 'rae' },
  viewer: 'owner',
} as never;

const listItem = (id: number) => ({ ...show(id), facts: null });

beforeEach(() => {
  loadSeriesOrNull
    .mockReset()
    .mockImplementation(async (id: number) => show(id));
  apiFetch.mockReset().mockImplementation(async (path: string) => {
    switch (path) {
      case '/user/:id/list/:list':
        return { items: saved.ids.map(listItem) };
      case '/me/circle':
        return { followingCount: 0, picks: [] };
      case '/me/overview':
        return { upNext: [] };
      case '/me/library-ids':
        return {
          favorites: [],
          inProgress: [],
          watched: [],
          watchlist: saved.ids,
        };
      default:
        throw new Error(`unexpected ${path}`);
    }
  });
});

describe('loadStartDeck', () => {
  it('deals the watchlist from three saved shows, with their logos', async () => {
    saved.ids = [10, 11, 12];
    const deck = await loadStartDeck(OWNER);
    expect(deck.source).toBe('watchlist');
    expect(deck.cards.map((card) => card.provider?.name)).toEqual([
      'N10',
      'N11',
      'N12',
    ]);
    expect(apiFetch).not.toHaveBeenCalledWith('/me/circle', expect.anything());
  });

  it('borrows without reading the saved shows: they are only left out', async () => {
    saved.ids = [10, 11];
    const deck = await loadStartDeck(OWNER);
    // Up next borrowed the first three; nothing saved is offered
    expect(deck).toMatchObject({ source: 'trending' });
    expect(deck.cards.map((card) => card.id)).toEqual([4, 5]);
    expect(loadSeriesOrNull).not.toHaveBeenCalled();
  });
});
