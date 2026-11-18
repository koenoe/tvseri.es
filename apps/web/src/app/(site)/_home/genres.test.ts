import { describe, expect, it } from 'vitest';

import { firstGenre, genreNames } from './genres';

const named = (...names: string[]) => ({
  genres: names.map((name) => ({ name })),
});

describe('genreNames', () => {
  it('keeps the named genres, in order, up to the count', () => {
    expect(genreNames(named('Drama', 'Crime', 'Mystery'), 2)).toEqual([
      'Drama',
      'Crime',
    ]);
  });

  it('leaves out genres that came as ids without a name', () => {
    expect(genreNames(named('', 'Crime', ' '), 2)).toEqual(['Crime']);
    expect(genreNames(named('', ''), 2)).toEqual([]);
  });
});

describe('firstGenre', () => {
  it('is the first named genre, or empty', () => {
    expect(firstGenre(named('', 'Comedy'))).toBe('Comedy');
    expect(firstGenre(named())).toBe('');
  });
});
