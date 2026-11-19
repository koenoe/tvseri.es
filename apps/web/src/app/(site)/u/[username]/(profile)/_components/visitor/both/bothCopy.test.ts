import { describe, expect, it } from 'vitest';

import { factsLine, nextLabel, relationLine } from './bothCopy';

describe('nextLabel', () => {
  it('words the three kinds', () => {
    expect(
      nextLabel({ date: '2027-01-07', kind: 'season-premiere', season: 3 }),
    ).toEqual({ text: 'S03 · Thu Jan 7', tone: 'pink' });
    expect(
      nextLabel({ date: '2026-11-15', episode: 3, kind: 'episode', season: 2 }),
    ).toEqual({ text: 'S02E03 · Sun Nov 15', tone: 'white' });
    expect(nextLabel({ kind: 'season-out', season: 2 })).toEqual({
      text: 'S02 out now',
      tone: 'cyan',
    });
  });

  it('has nothing without a next', () => {
    expect(nextLabel(null)).toBeNull();
  });
});

describe('relationLine', () => {
  const show = { id: 1, next: null, posterImage: '', slug: 's', title: 'T' };
  it.each([
    ['both-favourite', null, 'You both love it'],
    // an ended show, every aired season finished: the whole show
    ['both-finished', 'ended', 'You both finished it'],
    // a running show with every aired episode finished
    ['both-finished', 'up-to-date', 'You’re both up to date'],
    ['both-watching', null, 'You’re both watching'],
  ] as const)('%s (%s): %s', (relation, finished, line) => {
    expect(relationLine({ ...show, finished, relation })).toBe(line);
  });
});

describe('factsLine', () => {
  it('words the year, the seasons and the genre', () => {
    expect(factsLine({ genreId: 80, seasonCount: 3, year: 2019 })).toEqual({
      genre: 'Crime',
      seasons: '3 seasons',
      year: '2019',
    });
    expect(factsLine({ seasonCount: 1 }).seasons).toBe('1 season');
  });

  it('leaves out what the show lacks', () => {
    expect(factsLine({})).toEqual({
      genre: undefined,
      seasons: undefined,
      year: undefined,
    });
    // an id with no name in TMDB's TV list
    expect(factsLine({ genreId: 1 }).genre).toBeUndefined();
  });
});
