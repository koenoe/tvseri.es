import { DURATION_TILES_VERSION } from '@tvseri.es/constants';
import type { DurationShow, GoDeeper, TvSeries } from '@tvseri.es/schemas';
import { cacheLife } from 'next/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';

import { getLandingCounts, landingCountsKey } from './counts';
import { getDurationPage, getFinishThisWeekend } from './duration';
import { getGoDeeper } from './goDeeper';

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));

const fetchMock = vi.mocked(apiFetch);

const series = (id: number, title: string) =>
  ({
    backdropImage: `https://image.tmdb.org/b${id}.jpg`,
    firstAirDate: '2022-02-18',
    genres: [{ id: 18, name: 'Drama', slug: 'drama' }],
    id,
    originalTitle: title,
    posterImage: `https://image.tmdb.org/p${id}.jpg`,
    slug: title.toLowerCase(),
    title,
    voteAverage: 8.4,
    voteCount: 2100,
  }) as TvSeries;

const durationShow: DurationShow = {
  backdropImage: '',
  id: 87108,
  network: { id: 49, name: 'HBO' },
  numberOfEpisodes: 5,
  numberOfSeasons: 1,
  posterImage: 'https://image.tmdb.org/c.jpg',
  slug: 'chernobyl',
  title: 'Chernobyl',
  totalMinutes: 331,
  year: 2019,
};

describe('hub loaders', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T23:30:00-05:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks Go deeper for the UTC day and trims shows to tiles', async () => {
    const response: GoDeeper = {
      cards: [
        {
          from: { id: 225171, rank: 4, title: 'Pluribus' },
          items: [series(42009, 'Black Mirror')],
          kind: 'theme',
          to: { id: 4565, name: 'Dystopia', slug: 'dystopia' },
          total: 146,
          why: 'Also tagged dystopia, like Pluribus',
        },
      ],
      date: '2026-11-11',
      essentials: {
        items: [series(95396, 'Severance')],
        network: { id: 2552, name: 'Apple TV', slug: 'apple-tv' },
        total: 244,
      },
    };
    fetchMock.mockResolvedValueOnce(response);

    const view = await getGoDeeper();
    if (isUnavailable(view)) {
      throw new Error('expected data');
    }

    expect(fetchMock).toHaveBeenCalledWith('/discover/go-deeper', {
      query: { date: '2026-11-11' },
    });
    expect(view.essentials.network).toEqual({
      id: 2552,
      name: 'Apple TV',
      slug: 'apple-tv',
    });
    expect(view.essentials.items[0]).toMatchObject({
      id: 95396,
      title: 'Severance',
      year: 2022,
    });
    expect(view.cards[0]?.items[0]).not.toHaveProperty('description');
    expect(view.cards[0]).toMatchObject({
      from: { id: 225171, rank: 4, title: 'Pluribus' },
      kind: 'theme',
      total: 146,
    });
  });

  it('reads a Duration page and the weekend row as tile shows', async () => {
    fetchMock.mockResolvedValueOnce({
      bucket: 'under-6-hours',
      items: [durationShow],
      nextPage: 2,
      page: 1,
    });
    const page = await getDurationPage('under-6-hours');
    expect(fetchMock).toHaveBeenCalledWith('/duration/:bucket', {
      params: { bucket: 'under-6-hours' },
      query: { page: undefined, v: DURATION_TILES_VERSION },
    });
    expect(page).toEqual({
      items: [
        {
          backdrop: null,
          episodes: 5,
          id: 87108,
          minutes: 331,
          network: 'HBO',
          poster: 'https://image.tmdb.org/c.jpg',
          slug: 'chernobyl',
          title: 'Chernobyl',
          year: 2019,
        },
      ],
      nextPage: 2,
    });

    fetchMock.mockResolvedValueOnce({ items: [durationShow] });
    expect(await getFinishThisWeekend()).toMatchObject([{ minutes: 331 }]);
  });

  it('asks for landing counts once per canonical slug list', async () => {
    expect(landingCountsKey(['gb', 'de', 'gb'])).toBe('de,gb');
    expect(await getLandingCounts('country', '')).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce({ counts: { de: 2980, gb: 7240 } });
    expect(await getLandingCounts('country', 'de,gb')).toEqual({
      de: 2980,
      gb: 7240,
    });
    expect(fetchMock).toHaveBeenCalledWith('/discover/landing/:type/counts', {
      params: { type: 'country' },
      query: { slugs: 'de,gb' },
    });
  });

  it('gives Unavailable with a short life when the API fails, else its profile', async () => {
    fetchMock.mockRejectedValue(new ApiError(503));
    for (const read of [
      () => getGoDeeper(),
      () => getDurationPage('under-6-hours'),
      () => getFinishThisWeekend(),
      () => getLandingCounts('country', 'gb'),
    ]) {
      vi.mocked(cacheLife).mockClear();
      expect(isUnavailable(await read())).toBe(true);
      expect(vi.mocked(cacheLife).mock.calls).toEqual([['unavailable']]);
    }

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({ items: [] });
    vi.mocked(cacheLife).mockClear();
    await getFinishThisWeekend();
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['medium']]);
  });
});
