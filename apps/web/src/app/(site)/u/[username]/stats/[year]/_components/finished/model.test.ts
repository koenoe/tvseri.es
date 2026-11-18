import { describe, expect, it } from 'vitest';

import { finishedFacts, finishedTile, seasonsLabel } from './model';

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

  it('writes the tile lines', () => {
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

  // Finished in the year with nothing of it dated in the year (e.g. a whole
  // show marked "I don't remember"): the segment's 0 episodes, 0 minutes
  const undated = {
    ...show,
    episodes: 0,
    finishedAt: Date.UTC(2026, 10, 16, 21),
    runtimeMinutes: 0,
    seasons: [],
  };

  it('never claims 0 episodes or 0m', () => {
    const tile = finishedTile(undated, 2026);
    expect(tile.episodes).toBeNull();
    expect(tile.duration).toBeNull();
    expect(finishedFacts(tile)).toEqual([
      { kind: 'finished', text: 'Finished Nov 16' },
    ]);
  });

  it('leaves out only the runtime when the episodes have none', () => {
    const tile = finishedTile({ ...show, runtimeMinutes: 0 }, 2025);
    expect(finishedFacts(tile)).toEqual([
      { kind: 'seasons', text: 'S01, 15 episodes' },
      { kind: 'finished', text: 'Finished Apr 11' },
    ]);
  });

  it('keeps the three facts of a show watched in the year', () => {
    expect(finishedFacts(finishedTile(show, 2025))).toEqual([
      { kind: 'seasons', text: 'S01, 15 episodes' },
      { kind: 'finished', text: 'Finished Apr 11' },
      { kind: 'runtime', text: '13h 45m' },
    ]);
  });
});
