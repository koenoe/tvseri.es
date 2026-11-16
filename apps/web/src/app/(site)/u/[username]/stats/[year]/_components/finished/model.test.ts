import { describe, expect, it } from 'vitest';

import { FINISHED_TILES, finishedTile, seasonsLabel } from './model';

describe('seasonsLabel', () => {
  it('names one season', () => {
    expect(seasonsLabel([1])).toBe('S01');
  });
  it('joins a run of seasons', () => {
    expect(seasonsLabel([1, 2, 3])).toBe('S01–S03');
  });
  it('lists seasons that are not a run', () => {
    expect(seasonsLabel([1, 3])).toBe('S01, S03');
  });
  it('sorts', () => {
    expect(seasonsLabel([3, 1, 2])).toBe('S01–S03');
  });
  it('is empty without seasons', () => {
    expect(seasonsLabel([])).toBe('');
  });
});

describe('finishedTile', () => {
  const show = {
    episodes: 15,
    finishedAt: Date.UTC(2025, 3, 11, 20),
    id: 3,
    posterImage: null,
    runtimeMinutes: 825,
    seasons: [1],
    slug: 'the-pitt',
    title: 'The Pitt',
  };

  it('writes the lines the board draws', () => {
    expect(finishedTile(show, 2025)).toEqual({
      duration: '13h 45m',
      episodes: 'S01, 15 episodes',
      finished: 'Finished Apr 11',
      href: '/3/the-pitt',
      id: 3,
      title: 'The Pitt',
    });
  });

  it('counts one episode', () => {
    expect(
      finishedTile({ ...show, episodes: 1, seasons: [] }, 2025).episodes,
    ).toBe('1 episode');
  });

  it('draws six tiles', () => {
    expect(FINISHED_TILES).toBe(6);
  });
});
