import { describe, expect, it } from 'vitest';

import { defaultShelf, parseShelfQuery, toSearch } from './shelfQuery';

const counts = {
  all: 10,
  favourites: 3,
  finished: 4,
  hidden: 1,
  watching: 2,
  watchlist: 5,
};

describe('parseShelfQuery', () => {
  it('reads the defaults from an empty query', () => {
    expect(parseShelfQuery({}, 'watchlist', 'owner')).toEqual({
      from: null,
      q: '',
      shelf: 'watchlist',
      sort: 'newest',
      with: null,
    });
  });

  it('reads a valid sort, find, letter and filter', () => {
    expect(
      parseShelfQuery(
        { from: 'p', q: '  the wh ', sort: 'az', with: 'new' },
        'favourites',
        'visitor',
      ),
    ).toEqual({
      from: 'p',
      q: 'the wh',
      shelf: 'favourites',
      sort: 'az',
      with: 'new',
    });
  });

  it('falls back to the default for anything unknown', () => {
    expect(
      parseShelfQuery(
        { from: 'pp', sort: 'left', with: 'all' },
        'finished',
        'visitor',
      ),
    ).toMatchObject({ from: null, sort: 'recent', with: null });
  });

  it('drops a letter without A–Z', () => {
    expect(
      parseShelfQuery({ from: 'p', sort: 'newest' }, 'watchlist', 'owner').from,
    ).toBeNull();
  });

  it('drops the visitor filter on your own profile', () => {
    expect(parseShelfQuery({ with: 'shared' }, 'all', 'owner').with).toBeNull();
  });

  it('takes the first value of a repeated key and caps find at 100', () => {
    expect(
      parseShelfQuery(
        { q: ['a'.repeat(140), 'b'], sort: ['az', 'newest'] },
        'watchlist',
        'owner',
      ),
    ).toMatchObject({ q: 'a'.repeat(100), sort: 'az' });
  });

  it('reads # as a letter', () => {
    expect(
      parseShelfQuery({ from: '#', sort: 'az' }, 'finished', 'owner').from,
    ).toBe('#');
  });
});

describe('toSearch', () => {
  it('leaves out the defaults', () => {
    expect(toSearch(parseShelfQuery({}, 'watching', 'owner'))).toBe('');
  });

  it('round-trips a query in a fixed order', () => {
    const query = parseShelfQuery(
      { from: '#', q: 'bre', sort: 'az', with: 'shared' },
      'all',
      'visitor',
    );
    expect(toSearch(query)).toBe('?from=%23&q=bre&sort=az&with=shared');
    const back = Object.fromEntries(new URLSearchParams(toSearch(query)));
    expect(parseShelfQuery(back, 'all', 'visitor')).toEqual(query);
  });
});

describe('defaultShelf', () => {
  it('opens your own Library on Watching, someone else’s on Favourites', () => {
    expect(defaultShelf('owner', counts)).toBe('watching');
    expect(defaultShelf('visitor', counts)).toBe('favourites');
  });

  it('opens day 0 on the first shelf with something on it', () => {
    expect(defaultShelf('owner', { ...counts, watching: 0 })).toBe('watchlist');
    expect(
      defaultShelf('owner', { ...counts, watching: 0, watchlist: 0 }),
    ).toBe('finished');
    expect(
      defaultShelf('owner', {
        ...counts,
        finished: 0,
        watching: 0,
        watchlist: 0,
      }),
    ).toBe('favourites');
  });

  it('opens on Finished with nothing at all', () => {
    const none = {
      all: 0,
      favourites: 0,
      finished: 0,
      hidden: 0,
      watching: 0,
      watchlist: 0,
    };
    expect(defaultShelf('owner', none)).toBe('finished');
  });

  it('keeps a visitor on Favourites, and the owner on Watching, without counts', () => {
    expect(defaultShelf('owner', null)).toBe('watching');
    expect(defaultShelf('visitor', null)).toBe('favourites');
  });
});
