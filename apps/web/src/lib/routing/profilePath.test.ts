import { describe, expect, it } from 'vitest';

import profilePath, { libraryPath } from './profilePath';

describe('profilePath', () => {
  it('builds the overview and the sub-pages', () => {
    expect(profilePath('nina')).toBe('/u/nina');
    expect(profilePath('nina', 'history')).toBe('/u/nina/history');
    expect(profilePath('nina', 'library/watchlist')).toBe(
      '/u/nina/library/watchlist',
    );
  });

  it('encodes the username', () => {
    expect(profilePath('a b')).toBe('/u/a%20b');
  });
});

describe('libraryPath', () => {
  it('is the Library (its default shelf) without a shelf', () => {
    expect(libraryPath('nina')).toBe('/u/nina/library');
  });

  it('names the shelf as a path segment', () => {
    expect(libraryPath('nina', 'favourites')).toBe(
      '/u/nina/library/favourites',
    );
  });

  it('puts sort, find, letter and filter in the query', () => {
    expect(libraryPath('edw1n', 'favourites', { with: 'new' })).toBe(
      '/u/edw1n/library/favourites?with=new',
    );
    expect(libraryPath('edw1n', 'all', { with: 'shared' })).toBe(
      '/u/edw1n/library/all?with=shared',
    );
    expect(libraryPath('nina', 'watchlist', { q: 'the wh', sort: 'az' })).toBe(
      '/u/nina/library/watchlist?q=the+wh&sort=az',
    );
  });

  it('encodes the # letter and the username', () => {
    expect(libraryPath('a b', 'finished', { from: '#', sort: 'az' })).toBe(
      '/u/a%20b/library/finished?from=%23&sort=az',
    );
  });

  it('leaves out empty values', () => {
    expect(libraryPath('nina', 'watching', { q: '', sort: undefined })).toBe(
      '/u/nina/library/watching',
    );
  });
});
