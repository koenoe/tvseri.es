import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const { ApiError } = await import('@/lib/api/client');

const { decadeOf, decadeRows, getLandscape, landscapeQuery, missedQuery } =
  await import('./loaders');
const { planRow } = await import('../../../_discover/landing/planRow');

const series = (id: number, voteCount: number) => ({
  backdropImage: `https://image.tmdb.org/t/p/b${id}.jpg`,
  firstAirDate: '2011-04-17',
  genres: [{ id: 18, name: 'Drama', slug: 'drama' }],
  id,
  originalTitle: `Show ${id}`,
  posterImage: `https://image.tmdb.org/t/p/p${id}.jpg`,
  slug: `show-${id}`,
  title: `Show ${id}`,
  voteAverage: 8.4,
  voteCount,
});

const page = (items: ReadonlyArray<ReturnType<typeof series>>) => ({
  items,
  totalNumberOfItems: items.length,
  totalNumberOfPages: 1,
});

beforeEach(() => {
  apiFetch.mockReset();
});

describe('decadeOf', () => {
  it('reads a decade slug, null for anything else', () => {
    expect(decadeOf('2010s')).toMatchObject({
      from: 2010,
      label: '2010s',
      to: 2019,
    });
    expect(decadeOf('2015s')).toBeNull();
    expect(decadeOf('1830s')).toBeNull();
    expect(decadeOf('nope')).toBeNull();
  });
});

describe('queries', () => {
  it('asks for the decade by votes, and the missed ones by score', () => {
    expect(landscapeQuery('2010s')).toBe(
      'first_air_date.gte=2010-01-01&first_air_date.lte=2019-12-31&sort_by=vote_count.desc',
    );
    expect(missedQuery('2010s')).toBe(
      'first_air_date.gte=2010-01-01&first_air_date.lte=2019-12-31&sort_by=vote_average.desc&vote_average.gte=7.5&vote_count.gte=100&vote_count.lte=999',
    );
  });
});

describe('getLandscape', () => {
  it('lays out the eleven most-rated with their summaries', async () => {
    const shows = Array.from({ length: 14 }, (_, index) =>
      series(index + 1, 24_000 - index * 1000),
    );
    apiFetch.mockImplementation((path: string) =>
      path === '/discover'
        ? Promise.resolve(page(shows))
        : Promise.resolve({
            '1': {
              genreIds: [18],
              id: 1,
              lastAirYear: 2019,
              networks: [{ id: 49, name: 'HBO' }],
              numberOfEpisodes: 73,
              numberOfSeasons: 8,
              status: 'Ended',
              totalMinutes: 4380,
              year: 2011,
            },
          }),
    );

    const result = await getLandscape('2010s');
    const landscape = Array.isArray(result) ? result : [];

    expect(apiFetch).toHaveBeenCalledWith('/series/summaries', {
      query: { ids: '1,2,3,4,5,6,7,8,9,10,11' },
    });
    expect(landscape).toHaveLength(11);
    expect(landscape[0]).toMatchObject({
      bar: 100,
      kicker: 'Most rated of the decade',
      length: '8 seasons',
      network: 'HBO',
      reason:
        'The most-rated series of the decade on TMDB: eight seasons, finished in 2019.',
      title: 'Show 1',
      votes: '24,000',
      year: 2011,
    });
    expect(landscape[1]).toMatchObject({
      kicker: 'Number 2 by attention',
      length: null,
      network: null,
      reason: 'The second most-rated series of the decade on TMDB.',
    });
  });

  it('is Unavailable when the API can’t answer (never throws)', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(0, 'ApiNotConfigured'));
    await expect(getLandscape('2010s')).resolves.toEqual({
      unavailable: true,
    });
    apiFetch
      .mockResolvedValueOnce(page([series(1, 900)]))
      .mockRejectedValueOnce(new ApiError(503));
    await expect(getLandscape('2000s')).resolves.toEqual({
      unavailable: true,
    });
  });

  it('is empty for a decade without shows (no summaries call)', async () => {
    apiFetch.mockResolvedValueOnce(page([]));
    await expect(getLandscape('1940s')).resolves.toEqual([]);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});

describe('decadeRows', () => {
  it('drops the treemap’s shows from Missed by most', async () => {
    const top = Array.from({ length: 11 }, (_, index) =>
      series(index + 1, 900),
    );
    apiFetch.mockImplementation(
      (_path: string, { query }: { query: Record<string, string> }) =>
        Promise.resolve(
          page(
            query.sort_by === 'vote_count.desc'
              ? top
              : [
                  series(3, 900),
                  series(50, 800),
                  series(51, 700),
                  series(52, 600),
                ],
          ),
        ),
    );

    const plan = await planRow(decadeRows('1950s'), 1);

    expect(plan).toMatchObject({ kind: 'shows' });
    expect(
      'kind' in plan &&
        plan.kind === 'shows' &&
        plan.shows.map((show) => show.id),
    ).toEqual([50, 51, 52]);
  });

  it('leaves out Missed by most under three shows', async () => {
    const top = Array.from({ length: 11 }, (_, index) =>
      series(index + 1, 900),
    );
    apiFetch.mockImplementation(
      (_path: string, { query }: { query: Record<string, string> }) =>
        Promise.resolve(
          page(
            query.sort_by === 'vote_count.desc'
              ? top
              : [series(3, 900), series(50, 800), series(51, 700)],
          ),
        ),
    );

    const plan = await planRow(decadeRows('1950s'), 1);

    expect('kind' in plan && plan.kind === 'shows' && plan.shows).toEqual([]);
  });
});

describe('decadeRows when the API fails', () => {
  it('gives the row Unavailable, so it draws its skeleton', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    await expect(planRow(decadeRows('2010s'), 1)).resolves.toEqual({
      unavailable: true,
    });
  });
});
