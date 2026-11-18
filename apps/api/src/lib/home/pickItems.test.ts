import type { PickItem, TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { isDrawablePick, withGenreNames } from './pickItems';

const series = (overrides: Partial<TvSeries>) =>
  ({
    genres: [],
    posterImage: 'https://image.example.com/p.jpg',
    title: 'Boots',
    ...overrides,
  }) as TvSeries;

const LIST = [
  { id: 18, name: 'Drama', slug: 'drama' },
  { id: 35, name: 'Comedy', slug: 'comedy' },
];

describe('withGenreNames', () => {
  it('names genres that came as ids', () => {
    const named = withGenreNames(
      series({
        genres: [
          { id: 35, name: '', slug: '' },
          { id: 18, name: '', slug: '' },
        ],
      }),
      LIST,
    );
    expect(named.genres.map((genre) => genre.name)).toEqual([
      'Comedy',
      'Drama',
    ]);
  });

  it('drops an id the list does not know', () => {
    const named = withGenreNames(
      series({ genres: [{ id: 99, name: '', slug: '' }] }),
      LIST,
    );
    expect(named.genres).toEqual([]);
  });

  it('keeps a series whose genres are named as it is', () => {
    const named = series({
      genres: [{ id: 18, name: 'Drama', slug: 'drama' }],
    });
    expect(withGenreNames(named, LIST)).toBe(named);
  });
});

describe('isDrawablePick', () => {
  const pick = (overrides: Partial<TvSeries>): PickItem => ({
    reason: { kind: 'recommendation', label: '' },
    series: series(overrides),
  });

  it('needs a title and a poster', () => {
    expect(isDrawablePick(pick({}))).toBe(true);
    expect(isDrawablePick(pick({ title: ' ' }))).toBe(false);
    expect(isDrawablePick(pick({ posterImage: '' }))).toBe(false);
  });
});
