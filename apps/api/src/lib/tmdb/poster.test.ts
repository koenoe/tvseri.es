import { CreateListItemSchema, type TmdbTvSeries } from '@tvseri.es/schemas';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { normalizeTvSeries } from './helpers';

// TMDB's spec marks poster_path optional and real responses send null for a
// show nobody uploaded a poster for
const posterless = (overrides: Record<string, unknown> = {}) =>
  ({
    first_air_date: '2024-03-01',
    id: 7,
    name: 'Untitled Show',
    poster_path: null,
    status: 'Returning Series',
    ...overrides,
  }) as unknown as TmdbTvSeries;

describe('normalizeTvSeries: a show without a poster', () => {
  it('has an empty poster path and image, never null', () => {
    const series = normalizeTvSeries(posterless());
    expect(series.posterPath).toBe('');
    expect(series.posterImage).toBe('');
  });

  it('has an empty poster path when the field is missing and no image list came along', () => {
    const series = normalizeTvSeries(posterless({ poster_path: undefined }));
    expect(series.posterPath).toBe('');
  });

  it('can still be added to Favorites or the watchlist', () => {
    const series = normalizeTvSeries(posterless());
    const body = {
      id: series.id,
      posterPath: series.posterPath,
      slug: series.slug,
      status: series.status,
      title: series.title,
    };
    expect(v.is(CreateListItemSchema, body)).toBe(true);
  });

  it('keeps the first image-list poster when the details have none', () => {
    const series = normalizeTvSeries(
      posterless({ images: { posters: [{ file_path: '/fallback.jpg' }] } }),
    );
    expect(series.posterPath).toBe('/fallback.jpg');
  });
});
