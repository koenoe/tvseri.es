import { describe, expect, it } from 'vitest';

import { listWrites } from './writes';

const tvSeries = {
  id: 7,
  numberOfAiredEpisodes: 10,
  posterPath: '/p.jpg',
  slug: 'show-7',
  status: 'Ended',
  title: 'Show 7',
} as const;

const plan = (state: 'watched' | 'in_progress' | 'none') => ({
  lastWatchedAt: 1_000,
  regularCount: state === 'none' ? 0 : 5,
  state,
  tvSeries,
});

const item = {
  id: 7,
  posterPath: '/p.jpg',
  slug: 'show-7',
  status: 'Ended',
  title: 'Show 7',
};

describe('listWrites: what a placement plan writes (one rule, two executors)', () => {
  it('finished: into Finished, out of In progress, off the watchlist', () => {
    expect(listWrites(plan('watched'))).toEqual({
      alsoRemove: [],
      put: { ...item, createdAt: 1_000, listId: 'WATCHED' },
      remove: ['IN_PROGRESS'],
      watchlist: 'park',
    });
  });

  it('in progress: into In progress, out of Finished and Resuming soon', () => {
    expect(listWrites(plan('in_progress'), 2_000)).toEqual({
      alsoRemove: ['RESUMING_SOON'],
      put: { ...item, createdAt: 2_000, listId: 'IN_PROGRESS' },
      remove: ['WATCHED'],
      watchlist: 'park',
    });
  });

  it('nothing watched: out of all three, back onto the watchlist', () => {
    expect(listWrites(plan('none'))).toEqual({
      alsoRemove: ['RESUMING_SOON'],
      remove: ['WATCHED', 'IN_PROGRESS'],
      watchlist: 'restore',
    });
  });
});
