import { describe, expect, it } from 'vitest';

import { deckOffset, nextPick, restPose, shufflePose } from './deck';

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
      transform: 'translateX(0px) rotate(0deg) scale(1)',
      zIndex: 10,
    });
  });

  it('fans the others out, smaller and darker the further back (board p3Rest)', () => {
    expect(restPose(0, 1, 7)).toEqual({
      brightness: 0.6,
      transform: 'translateX(110px) rotate(5deg) scale(0.9)',
      zIndex: 9,
    });
    expect(restPose(0, 5, 7)).toEqual({
      brightness: 0.525,
      transform: 'translateX(-204px) rotate(-10deg) scale(0.8)',
      zIndex: 8,
    });
    expect(restPose(0, 3, 7)).toEqual({
      brightness: 0.45,
      transform: 'translateX(282px) rotate(15deg) scale(0.7)',
      zIndex: 7,
    });
  });
});

describe('shufflePose', () => {
  it('gathers the cards into a loose pile (board p3Vals shuf)', () => {
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
