import type { TvSeries } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadTrending, toNotFoundShows } from './trending';

const readTrendingShows = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/series/trending', () => ({ readTrendingShows }));

beforeEach(() => {
  vi.mocked(cacheLife).mockClear();
  vi.mocked(cacheTag).mockClear();
});

const series = (
  id: number,
  title: string,
  posterImage: string,
): Pick<TvSeries, 'id' | 'posterImage' | 'slug' | 'title'> => ({
  id,
  posterImage,
  slug: title.toLowerCase().replace(/\s+/g, '-'),
  title,
});

describe('toNotFoundShows', () => {
  it('keeps only what the 404 draws, and only shows with a poster', () => {
    const shows = toNotFoundShows([
      {
        ...series(
          1396,
          'Breaking Bad',
          'https://image.tmdb.org/t/p/w300_and_h450_bestv2/a.jpg',
        ),
        voteCount: 9,
      } as unknown as TvSeries,
      series(1, 'No Poster', '') as TvSeries,
    ]);
    expect(shows).toEqual([
      {
        id: 1396,
        poster: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/a.jpg',
        slug: 'breaking-bad',
        title: 'Breaking Bad',
      },
    ]);
  });
});

describe('loadTrending', () => {
  it('is trending trimmed to what the 404 draws, kept for the API’s life', async () => {
    readTrendingShows.mockResolvedValue([
      series(95480, 'Slow Horses', 'https://image.tmdb.org/p.jpg'),
    ]);
    await expect(loadTrending()).resolves.toEqual([
      {
        id: 95480,
        poster: 'https://image.tmdb.org/p.jpg',
        slug: 'slow-horses',
        title: 'Slow Horses',
      },
    ]);
    expect(cacheLife).toHaveBeenLastCalledWith('short');
  });

  // Every page carries the 404 boundary: a `home` tag here would let Home's
  // admin refresh expire the whole site
  it('is tagged nothing', async () => {
    readTrendingShows.mockResolvedValue([]);
    await loadTrending();
    expect(cacheTag).not.toHaveBeenCalled();
  });

  it('is empty when the API is down or not configured (the build)', async () => {
    readTrendingShows.mockResolvedValue({ unavailable: true });
    await expect(loadTrending()).resolves.toEqual([]);
    expect(cacheLife).toHaveBeenLastCalledWith('unavailable');
  });

  it('does not swallow any other error', async () => {
    readTrendingShows.mockRejectedValue(new Error('a bug'));
    await expect(loadTrending()).rejects.toThrow('a bug');
  });
});
