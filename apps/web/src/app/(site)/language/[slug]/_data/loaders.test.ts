import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const { ApiError } = await import('@/lib/api/client');

const { getTitleWall, languageQuery, languageRows } = await import('./loaders');
const { planRow } = await import('../../../_discover/landing/planRow');

const series = (id: number, animated = true) => ({
  backdropImage: '',
  firstAirDate: '2013-04-07',
  genres: animated ? [{ id: 16, name: 'Animation', slug: 'animation' }] : [],
  id,
  originalTitle: `原題 ${id}`,
  posterImage: `https://image.tmdb.org/t/p/p${id}.jpg`,
  slug: `show-${id}`,
  title: `Show ${id}`,
  voteAverage: 8.6,
  voteCount: 9000 - id,
});

const discover = (count: number) => ({
  items: Array.from({ length: count }, (_, index) =>
    series(index + 1, index % 2 === 0),
  ),
  totalNumberOfItems: count,
  totalNumberOfPages: 1,
});

beforeEach(() => {
  apiFetch.mockReset();
});

describe('languageQuery', () => {
  it('asks for the language by votes', () => {
    expect(languageQuery('ja')).toBe(
      'sort_by=vote_count.desc&with_original_language=ja',
    );
  });
});

describe('getTitleWall', () => {
  it('is the eight after Start here, with their romanised titles', async () => {
    apiFetch.mockImplementation((path: string) =>
      Promise.resolve(
        path === '/discover'
          ? discover(20)
          : { '6': 'Rōmaji 6', '7': null, '8': null, '9': 'Rōmaji 9' },
      ),
    );

    const result = await getTitleWall('ja');
    const wall = Array.isArray(result) ? result : [];

    expect(apiFetch).toHaveBeenCalledWith('/series/romanized-titles', {
      query: { ids: '6,7,8,9,10,11,12,13' },
    });
    expect(wall.map((card) => card.id)).toEqual([6, 7, 8, 9, 10, 11, 12, 13]);
    expect(wall[0]).toMatchObject({
      kind: 'Live action',
      titles: { english: 'Show 6', native: '原題 6', romanized: 'Rōmaji 6' },
      year: 2013,
    });
    expect(wall[1]?.kind).toBe('Animation');
  });

  it('is empty without a call for romaji when the language has five shows', async () => {
    apiFetch.mockResolvedValueOnce(discover(5));
    await expect(getTitleWall('ja')).resolves.toEqual([]);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});

describe('getTitleWall without the API', () => {
  it('is Unavailable instead of throwing', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(0, 'ApiTimeout'));
    await expect(getTitleWall('ko')).resolves.toEqual({ unavailable: true });
    apiFetch
      .mockResolvedValueOnce(discover(20))
      .mockRejectedValueOnce(new ApiError(500));
    await expect(getTitleWall('es')).resolves.toEqual({ unavailable: true });
  });
});

describe('languageRows', () => {
  it('starts with the five most-rated', async () => {
    apiFetch.mockResolvedValue(discover(20));
    const plan = await planRow(languageRows('ja'), 0);
    expect(plan).toMatchObject({ limit: 5 });
    expect(
      'kind' in plan &&
        plan.kind === 'shows' &&
        plan.shows.slice(0, 5).map((s) => s.id),
    ).toEqual([1, 2, 3, 4, 5]);
  });
});
