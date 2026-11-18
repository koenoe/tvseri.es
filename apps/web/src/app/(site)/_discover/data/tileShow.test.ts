import type { TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { toTileShow } from './tileShow';

const series = {
  backdropImage: 'https://image.tmdb.org/t/p/w1920_and_h1080_multi_faces/b.jpg',
  firstAirDate: '2008-01-20',
  genres: [
    { id: 80, name: 'Crime', slug: 'crime' },
    { id: 18, name: 'Drama', slug: 'drama' },
  ],
  id: 1396,
  network: { id: 174, name: 'AMC' },
  originalTitle: 'Breaking Bad',
  posterImage: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/p.jpg',
  slug: 'breaking-bad',
  title: 'Breaking Bad',
  voteAverage: 8.9,
  voteCount: 16000,
} as TvSeries;

describe('toTileShow', () => {
  it('keeps only what a tile draws', () => {
    expect(toTileShow(series)).toEqual({
      backdrop: 'https://image.tmdb.org/t/p/w1920_and_h1080_multi_faces/b.jpg',
      genreIds: [80, 18],
      id: 1396,
      network: 'AMC',
      originalTitle: 'Breaking Bad',
      poster: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/p.jpg',
      slug: 'breaking-bad',
      title: 'Breaking Bad',
      voteAverage: 8.9,
      voteCount: 16000,
      year: 2008,
    });
  });

  it('has no year, images or network when TMDB has none', () => {
    const tile = toTileShow({
      ...series,
      backdropImage: '',
      firstAirDate: '',
      network: undefined,
      posterImage: '',
    });
    expect(tile.year).toBeNull();
    expect(tile.network).toBeNull();
    expect(tile.poster).toBeNull();
    expect(tile.backdrop).toBeNull();
  });
});
