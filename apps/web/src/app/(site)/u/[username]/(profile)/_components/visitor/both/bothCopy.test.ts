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
  const show = { id: 1, posterImage: '', slug: 's', title: 'T' } as const;
  it('says what you both did', () => {
    expect(
      relationLine({
        ...show,
        finishedSeason: null,
        next: null,
        relation: 'both-favourite',
      }),
    ).toBe('You both love it');
    expect(
      relationLine({
        ...show,
        finishedSeason: 2,
        next: null,
        relation: 'both-finished',
      }),
    ).toBe('You both finished Season 2');
    expect(
      relationLine({
        ...show,
        finishedSeason: 6,
        next: null,
        relation: 'both-finished',
      }),
    ).toBe('You both finished Season 6');
    expect(
      relationLine({
        ...show,
        finishedSeason: null,
        next: null,
        relation: 'both-finished',
      }),
    ).toBe('You both finished it');
    expect(
      relationLine({
        ...show,
        finishedSeason: null,
        next: null,
        relation: 'both-watching',
      }),
    ).toBe('You’re both watching');
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
