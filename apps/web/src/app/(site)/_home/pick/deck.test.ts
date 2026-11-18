import type { LibraryIds } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { dealPick, deckOffset, nextPick, restPose } from './deck';

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
  const poses = [0, 1, 2, 3, 4, 5, 6].map((k) => restPose(0, k, 7));

  it('puts the pick in front, upright and bright', () => {
    expect(poses[0]).toMatchObject({ brightness: 1, zIndex: 10 });
    expect(poses[0]?.transform).toContain('rotate(0deg) scale(1)');
  });

  it('fans the others out to both sides, smaller, darker and further back the further away', () => {
    // offsets 1, 2, 3 to the right and their mirrors on the left
    for (const [near, far] of [
      [1, 2],
      [2, 3],
      [6, 5],
      [5, 4],
    ] as const) {
      expect(poses[far]!.brightness).toBeLessThan(poses[near]!.brightness);
      expect(poses[far]!.zIndex).toBeLessThan(poses[near]!.zIndex);
    }
    expect(poses[1]).toMatchObject({
      brightness: poses[6]!.brightness,
      zIndex: poses[6]!.zIndex,
    });
    expect(poses[1]!.transform).toMatch(/translateX\(calc\(\d/);
    expect(poses[6]!.transform).toMatch(/translateX\(calc\(-\d/);
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
