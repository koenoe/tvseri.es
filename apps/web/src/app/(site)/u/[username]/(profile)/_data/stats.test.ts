import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch, cacheLife, cacheTag } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const { loadYearSoFar } = await import('./stats');
const { getSummary } = await import('@/lib/stats/loaders');

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockImplementation(async (path: string) => {
    if (path.endsWith('/summary')) {
      return { current: { episodeCount: 3, totalRuntime: 90 } };
    }
    if (path.endsWith('/genres')) {
      return [
        { count: 1, genre: 'Drama' },
        { count: 4, genre: 'Crime' },
        { count: 2, genre: 'Comedy' },
      ];
    }
    return [];
  });
});

describe('loadYearSoFar', () => {
  it('asks the API the same four URLs as the Stats page, so its CDN keeps one copy', async () => {
    await loadYearSoFar('user-1', 2026);
    await getSummary('user-1', 2026);
    const urls = apiFetch.mock.calls.map(([path, options]) => ({
      path,
      ...options,
    }));
    expect(urls).toHaveLength(5);
    for (const url of urls) {
      expect(url).toEqual({
        params: { id: 'user-1', year: 2026 },
        path: expect.stringMatching(
          /^\/user\/:id\/stats\/:year\/(summary|weekly|genres|providers)$/,
        ),
      });
    }
    expect(urls[4]).toEqual(urls[0]);
  });

  it('draws the sentence from the year: episodes, time, the top two genres', async () => {
    await expect(loadYearSoFar('user-1', 2026)).resolves.toEqual({
      episodes: 3,
      genres: ['Crime', 'Comedy'],
      provider: null,
      runtime: 90,
      weeks: [],
    });
  });

  it('a new member’s empty year is an empty year, not a failure', async () => {
    const weeks = Array.from({ length: 53 }, (_, index) => ({
      episodes: 0,
      runtimeHours: 0,
      totalRuntime: 0,
      week: index + 1,
    }));
    apiFetch.mockImplementation(async (path: string) => {
      if (path.endsWith('/summary')) {
        return { current: { episodeCount: 0, totalRuntime: 0 } };
      }
      return path.endsWith('/weekly') ? weeks : [];
    });

    await expect(loadYearSoFar('user-1', 2026)).resolves.toEqual({
      episodes: 0,
      genres: [],
      provider: null,
      runtime: 0,
      weeks: weeks.map(() => 0),
    });
  });
});
