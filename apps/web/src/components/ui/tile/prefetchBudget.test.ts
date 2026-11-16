import { describe, expect, it } from 'vitest';

import {
  countFetch,
  isPrefetchExhausted,
  PREFETCH_FETCH_LIMIT,
} from './prefetchBudget';

const here = new URL('https://www.tvseri.es/genre/crime');
const rsc = (path: string) => `https://www.tvseri.es${path}?_rsc=abc`;

describe('prefetchBudget', () => {
  it('stops a path after LIMIT fetches that never got cached', () => {
    for (let i = 1; i < PREFETCH_FETCH_LIMIT; i++) {
      countFetch(rsc('/990010/mobland'), 'fetch', here);
    }
    expect(isPrefetchExhausted('/990010/mobland')).toBe(false);
    countFetch(rsc('/990010/mobland'), 'fetch', here);
    expect(isPrefetchExhausted('/990010/mobland')).toBe(true);
    expect(isPrefetchExhausted('/990010/mobland?season=2')).toBe(true);
  });

  it('counts only RSC fetches for other pages of this site', () => {
    for (let i = 0; i < PREFETCH_FETCH_LIMIT; i++) {
      countFetch('https://www.tvseri.es/1396/breaking-bad', 'fetch', here);
      countFetch(rsc('/1396/breaking-bad'), 'img', here);
      countFetch('https://image.tmdb.org/1396?_rsc=x', 'fetch', here);
      countFetch(rsc('/genre/crime'), 'fetch', here);
    }
    expect(isPrefetchExhausted('/1396/breaking-bad')).toBe(false);
    expect(isPrefetchExhausted('/genre/crime')).toBe(false);
  });
});
