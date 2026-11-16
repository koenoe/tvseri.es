import type { LibraryIds } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  DEAL_SIZE,
  dealPick,
  deckOffset,
  nextPick,
  restPose,
  shufflePose,
} from './deck';

describe('deckOffset', () => {
  it('fans seven cards three to each side of the pick', () => {
    const offsets = [0, 1, 2, 3, 4, 5, 6].map((k) => deckOffset(0, k, 7));
    expect(offsets).toEqual([0, 1, 2, 3, -3, -2, -1]);
  });

  it('follows the pick around the deck', () => {
    expect(deckOffset(5, 0, 7)).toBe(2);
    expect(deckOffset(5, 4, 7)).toBe(-1);
  });
});

describe('restPose', () => {
  it('puts the pick in front, upright and bright', () => {
    expect(restPose(0, 0, 7)).toEqual({
      brightness: 1,
      transform:
        'translateX(calc(0px * var(--fan-spread, 1))) rotate(0deg) scale(1)',
      zIndex: 10,
    });
  });

  it('fans the others out, smaller and darker the further back', () => {
    expect(restPose(0, 1, 7)).toEqual({
      brightness: 0.6,
      transform:
        'translateX(calc(110px * var(--fan-spread, 1))) rotate(5deg) scale(0.9)',
      zIndex: 9,
    });
    expect(restPose(0, 5, 7)).toEqual({
      brightness: 0.525,
      transform:
        'translateX(calc(-204px * var(--fan-spread, 1))) rotate(-10deg) scale(0.8)',
      zIndex: 8,
    });
    expect(restPose(0, 3, 7)).toEqual({
      brightness: 0.45,
      transform:
        'translateX(calc(282px * var(--fan-spread, 1))) rotate(15deg) scale(0.7)',
      zIndex: 7,
    });
  });
});

describe('shufflePose', () => {
  it('gathers the cards into a loose pile', () => {
    expect(shufflePose(0, 2)).toEqual({
      brightness: 0.71,
      transform: 'translate(36px, -4px) rotate(12deg) scale(0.86)',
      zIndex: 0,
    });
    expect(shufflePose(3, 2)).toEqual({
      brightness: 0.63,
      transform: 'translate(-18px, 4px) rotate(-6deg) scale(0.86)',
      zIndex: 3,
    });
  });
});

describe('nextPick', () => {
  it('never picks the same card twice in a row', () => {
    for (const random of [0, 0.2, 0.5, 0.99]) {
      expect(nextPick(3, 7, random)).not.toBe(3);
    }
  });

  it('reaches every other card', () => {
    const picks = new Set(
      [0, 1, 2, 3, 4, 5].map((n) => nextPick(0, 7, n / 6 + 0.01)),
    );
    expect([...picks].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('keeps a lone card', () => {
    expect(nextPick(0, 1, 0.5)).toBe(0);
  });
});

describe('dealPick', () => {
  const pool = Array.from({ length: 12 }, (_, k) => ({ id: k + 1 }));
  const ids = (lists: Partial<LibraryIds>): LibraryIds => ({
    favorites: [],
    inProgress: [],
    watched: [],
    watchlist: [],
    ...lists,
  });
  const idsOf = (cards: ReadonlyArray<Readonly<{ id: number }>>) =>
    cards.map((card) => card.id);

  it('deals the day’s seven while the viewer is unknown (signed out)', () => {
    expect(idsOf(dealPick(pool, null))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(DEAL_SIZE).toBe(7);
  });

  it('never deals a show the viewer started, finished or is up to date with', () => {
    const dealt = dealPick(pool, ids({ inProgress: [1, 4], watched: [2, 9] }));
    expect(idsOf(dealt)).toEqual([3, 5, 6, 7, 8, 10, 11]);
  });

  it('keeps shows on the watchlist (and favourites) that are not started', () => {
    const dealt = dealPick(pool, ids({ favorites: [2], watchlist: [1, 3] }));
    expect(idsOf(dealt)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('deals fewer when the reserve runs short, none when nothing is new', () => {
    const started = idsOf(pool).filter((id) => id !== 12 && id !== 5);
    expect(idsOf(dealPick(pool, ids({ inProgress: started })))).toEqual([
      5, 12,
    ]);
    expect(dealPick(pool, ids({ watched: idsOf(pool) }))).toEqual([]);
  });
});
