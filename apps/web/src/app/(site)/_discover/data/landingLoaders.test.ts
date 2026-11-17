import { cacheLife } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';

const apiFetch = vi.fn();

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const { getShowSummaries, summaryIds } = await import('./summaries');
const { getWhereToStart } = await import('./whereToStart');
const { getDiscoverShows } = await import('./discover');
const { getLandingFacts } = await import('./facts');
const { getIndexChips } = await import('../lists/lists');
const { genreNameById, genreNameBySlug } = await import('./genreNames');
const { getLandingColour } = await import('./leadColour');

beforeEach(() => {
  apiFetch.mockReset();
});

const summary = (id: number) => ({
  genreIds: [80],
  id,
  lastAirYear: 2013,
  networks: [
    { id: 174, name: 'AMC' },
    { id: 4, name: 'BBC One' },
  ],
  numberOfEpisodes: 62,
  numberOfSeasons: 5,
  status: 'Ended',
  totalMinutes: 2914,
  year: 2008,
});

describe('getShowSummaries', () => {
  it('asks for distinct sorted ids and keeps the first network', async () => {
    apiFetch.mockResolvedValueOnce({ '7': null, '1396': summary(1396) });
    const ids = summaryIds([1396, 7, 1396]);
    expect(ids).toBe('7,1396');
    const summaries = await getShowSummaries(ids);
    expect(apiFetch).toHaveBeenCalledWith('/series/summaries', {
      query: { ids: '7,1396' },
    });
    expect(summaries).toEqual({
      1396: {
        episodes: 62,
        lastAirYear: 2013,
        network: 'AMC',
        seasons: 5,
        status: 'Ended',
        totalMinutes: 2914,
        year: 2008,
      },
    });
  });

  it('splits more than 50 ids into calls of 50 (the API limit)', async () => {
    apiFetch.mockImplementation((_, { query }: { query: { ids: string } }) =>
      Promise.resolve(
        Object.fromEntries(
          query.ids.split(',').map((id) => [id, summary(Number(id))]),
        ),
      ),
    );
    const ids = Array.from({ length: 60 }, (_, index) => index + 1);
    const summaries = await getShowSummaries(summaryIds(ids));
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch.mock.calls[1]?.[1]).toEqual({
      query: { ids: ids.slice(50).join(',') },
    });
    expect(Object.keys(summaries)).toHaveLength(60);
  });

  it('asks once for exactly 50 ids', async () => {
    apiFetch.mockResolvedValue({});
    const ids = Array.from({ length: 50 }, (_, index) => index + 1);
    await getShowSummaries(summaryIds(ids));
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});

describe('getWhereToStart', () => {
  it('asks by genre, keyword or country and trims each pick to its card', async () => {
    apiFetch.mockResolvedValueOnce({
      picks: [
        {
          kind: 'night',
          show: {
            backdropImage: 'b.jpg',
            id: 1,
            network: { id: 213, name: 'Netflix' },
            numberOfEpisodes: 10,
            numberOfSeasons: 1,
            posterImage: '',
            slug: 'cyberpunk-edgerunners',
            title: 'Cyberpunk: Edgerunners',
            totalMinutes: 250,
            year: 2022,
          },
          why: '10 episodes, 4h 10m in all',
        },
      ],
      theme: 'dystopia',
    });
    const picks = await getWhereToStart('theme', 'dystopia');
    expect(apiFetch).toHaveBeenCalledWith('/duration/where-to-start', {
      query: { theme: 'dystopia' },
    });
    expect(picks).toEqual([
      {
        backup: false,
        episodes: 10,
        id: 1,
        kind: 'night',
        network: 'Netflix',
        poster: null,
        seasons: 1,
        slug: 'cyberpunk-edgerunners',
        title: 'Cyberpunk: Edgerunners',
        totalMinutes: 250,
        why: '10 episodes, 4h 10m in all',
        year: 2022,
      },
    ]);
  });
});

describe('getWhereToStart backups', () => {
  it('lists the backups after the picks, marked, never a show twice', async () => {
    const show = (id: number) => ({
      backdropImage: '',
      id,
      network: null,
      numberOfEpisodes: 6,
      numberOfSeasons: 1,
      posterImage: '',
      slug: `show-${id}`,
      title: `Show ${id}`,
      totalMinutes: 300,
      year: 2020,
    });
    apiFetch.mockResolvedValueOnce({
      backups: [
        { kind: 'night', show: show(1), why: '' },
        { kind: 'night', show: show(2), why: '' },
      ],
      genre: 'drama',
      picks: [{ kind: 'night', show: show(1), why: '' }],
    });
    const picks = await getWhereToStart('genre', 'drama');
    expect(
      !('unavailable' in picks) && picks.map((pick) => [pick.id, pick.backup]),
    ).toEqual([
      [1, false],
      [2, true],
    ]);
  });
});

describe('genre names', () => {
  it('names genres by slug and by TMDB id', () => {
    expect(genreNameBySlug('crime')).toBe('Crime');
    expect(genreNameBySlug('sci-fi-fantasy')).toBe('Sci-Fi & Fantasy');
    expect(genreNameBySlug('nope')).toBeUndefined();
    expect(genreNameById(10765)).toBe('Sci-Fi & Fantasy');
    expect(genreNameById(1)).toBeUndefined();
  });

  it('names the genres TMDB only has as a keyword by slug, never by id', () => {
    expect(genreNameBySlug('horror')).toBe('Horror');
    expect(genreNameBySlug('thriller')).toBe('Thriller');
    expect(genreNameBySlug('romance')).toBe('Romance');
    // 9840 is Romance's keyword, not a TMDB genre id
    expect(genreNameById(9840)).toBeUndefined();
  });
});

describe('when the API fails', () => {
  it.each([
    ['discover', () => getDiscoverShows('with_genres=80')],
    ['facts', () => getLandingFacts('genre', 'crime')],
    ['summaries', () => getShowSummaries('1,2')],
    ['where to start', () => getWhereToStart('genre', 'crime')],
    ['index chips', () => getIndexChips('country')],
  ])('%s gives Unavailable with a short life', async (_, read) => {
    apiFetch.mockRejectedValue(new ApiError(0, 'ApiTimeout'));
    vi.mocked(cacheLife).mockClear();
    expect(isUnavailable(await read())).toBe(true);
    expect(vi.mocked(cacheLife).mock.calls.at(-1)).toEqual(['unavailable']);
  });

  // The API answers 503 (never cached) when TMDB failed for one of the
  // shows, instead of a null that would read as "no such show" for a week
  it.each([
    ['summaries', () => getShowSummaries('1,2')],
    ['where to start', () => getWhereToStart('theme', 'dystopia')],
  ])(
    "%s never caches the API's partial-failure 503 under medium",
    async (_, read) => {
      apiFetch.mockRejectedValue(new ApiError(503));
      vi.mocked(cacheLife).mockClear();
      expect(isUnavailable(await read())).toBe(true);
      expect(vi.mocked(cacheLife).mock.calls).toEqual([['unavailable']]);
    },
  );

  it('keeps an unknown slug a real, long-cached null', async () => {
    apiFetch.mockResolvedValueOnce(null);
    vi.mocked(cacheLife).mockClear();
    expect(await getLandingFacts('genre', 'nope')).toBeNull();
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['medium']]);
  });

  it('passes a failed count on instead of caching a partial index', async () => {
    apiFetch.mockImplementation((path: string) =>
      path === '/discover/countries'
        ? Promise.resolve([{ code: 'GB', englishName: 'United Kingdom' }])
        : Promise.reject(new ApiError(503)),
    );
    vi.mocked(cacheLife).mockClear();
    expect(isUnavailable(await getIndexChips('country'))).toBe(true);
    expect(vi.mocked(cacheLife).mock.calls.at(-1)).toEqual(['unavailable']);
    expect(vi.mocked(cacheLife).mock.calls).not.toContainEqual(['medium']);
  });
});

describe('getLandingColour', () => {
  it('reads each candidate as the show page does, one request per show', async () => {
    apiFetch.mockImplementation(
      (_: string, { params }: { params: { id: number } }) =>
        Promise.resolve({ backdropColor: params.id === 2 ? '#3a6ea5' : null }),
    );
    expect(await getLandingColour([1, 2, 1])).toBe('#3a6ea5');
    expect(apiFetch.mock.calls).toEqual(
      [1, 2].map((id) => [
        '/series/:id',
        { notFound: 'null', params: { id }, query: { include_images: true } },
      ]),
    );
  });

  it('reads an outage as no colour', async () => {
    apiFetch.mockRejectedValue(new ApiError(0, 'ApiTimeout'));
    expect(await getLandingColour([1])).toBeNull();
  });
});
