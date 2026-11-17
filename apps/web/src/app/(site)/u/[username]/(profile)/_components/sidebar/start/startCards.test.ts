import { describe, expect, it } from 'vitest';

import { dealRandom, seasonsLabel, sendToBack, slotAt } from './startCards';

describe('copy', () => {
  it('counts seasons', () => {
    expect(seasonsLabel(1, true)).toBe('1 season out');
    expect(seasonsLabel(3, false)).toBe('3 seasons');
    expect(seasonsLabel(0, false)).toBe('');
  });
});

describe('sendToBack', () => {
  it('moves the top card to the end', () => {
    expect(sendToBack([1, 2, 3])).toEqual([2, 3, 1]);
    expect(sendToBack([])).toEqual([]);
  });
});

describe('dealRandom', () => {
  it('brings a card other than the top to the front, keeping the rest in order', () => {
    expect(dealRandom([1, 2, 3, 4], () => 0)).toEqual([2, 1, 3, 4]);
    expect(dealRandom([1, 2, 3, 4], () => 0.99)).toEqual([4, 1, 2, 3]);
  });

  it('has nothing to deal with one card', () => {
    expect(dealRandom([1], () => 0.5)).toEqual([1]);
  });
});

describe('slotAt', () => {
  it('fans five cards and hides the rest', () => {
    expect(slotAt(0)).toMatchObject({ rotate: 0, x: 0 });
    expect(slotAt(3)).toMatchObject({ rotate: -14, x: -84, y: 22 });
    expect(slotAt(7).opacity).toBe(0);
  });
});

describe('withoutShows: never the same show twice', () => {
  it('leaves out the shows Up next borrowed, in order', async () => {
    const { withoutShows } = await import('./loadStart');
    const cards = [5, 1, 7, 2].map((id) => ({ id }));
    expect(withoutShows(cards, new Set([1, 2]))).toEqual([
      { id: 5 },
      { id: 7 },
    ]);
  });
});

describe('borrowable: never a series you already have', () => {
  it('leaves out what you watch, finished, saved or favourited, and what Up next borrowed', async () => {
    const { borrowable } = await import('./loadStart');
    const cards = [5, 1, 7, 2, 9, 4, 3].map((id) => ({ id }));
    const library = {
      favorites: [3],
      inProgress: [7],
      watched: [9],
      watchlist: [4],
    };
    expect(borrowable(cards, new Set([1, 2]), library)).toEqual([{ id: 5 }]);
  });

  it('without the library (its read failed) still leaves out Up next', async () => {
    const { borrowable } = await import('./loadStart');
    const cards = [5, 1].map((id) => ({ id }));
    expect(borrowable(cards, new Set([1]), null)).toEqual([{ id: 5 }]);
  });
});
