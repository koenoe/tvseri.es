import { describe, expect, it } from 'vitest';

import { relationOf } from './relation';

const ids = {
  favorites: [1],
  inProgress: [4],
  watched: [1, 2],
  watchlist: [3],
};

describe('relationOf', () => {
  it('reads the strongest relation first', () => {
    expect(relationOf(ids, 1)).toBe('both-love');
    expect(relationOf(ids, 2)).toBe('seen');
    expect(relationOf(ids, 4)).toBe('watching');
    expect(relationOf(ids, 3)).toBe('watchlist');
    expect(relationOf(ids, 9)).toBe('new');
  });

  it('is only "both love" when the owner loves it too', () => {
    expect(relationOf(ids, 1, { ownerFavourite: false })).toBe('seen');
    expect(relationOf(ids, 1, { ownerFavourite: true })).toBe('both-love');
  });

  it('reads a favourite you never finished as seen without theirs', () => {
    const lone = { ...ids, favorites: [7] };
    expect(relationOf(lone, 7, { ownerFavourite: false })).toBe('seen');
  });
});
