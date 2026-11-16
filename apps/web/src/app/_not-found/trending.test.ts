import type { TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it, vi } from 'vitest';

import { loadTrending, toNotFoundShows } from './trending';

const loadTrendingShows = vi.hoisted(() => vi.fn());

vi.mock('@/lib/series/trending', () => ({ loadTrendingShows }));

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
  it('is the shared read, trimmed to what the 404 draws', async () => {
    loadTrendingShows.mockResolvedValue([
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
  });

  it('is empty when the API is down or not configured (the build)', async () => {
    loadTrendingShows.mockResolvedValue({ unavailable: true });
    await expect(loadTrending()).resolves.toEqual([]);
  });

  it('does not swallow any other error', async () => {
    loadTrendingShows.mockRejectedValue(new Error('a bug'));
    await expect(loadTrending()).rejects.toThrow('a bug');
  });
});
