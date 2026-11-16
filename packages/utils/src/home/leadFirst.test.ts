import { describe, expect, it } from 'vitest';

import { leadFirst } from './leadFirst';

type Item = Readonly<{
  rank: number;
  series: Readonly<{ backdropImage?: string }>;
}>;

const item = (rank: number, backdropImage?: string): Item => ({
  rank,
  series: { backdropImage },
});

const ranks = (items: ReadonlyArray<Item>) => items.map((entry) => entry.rank);

describe('leadFirst', () => {
  it('keeps rank order when the first has a backdrop', () => {
    expect(ranks(leadFirst([item(1, 'a'), item(2, 'b'), item(3)]))).toEqual([
      1, 2, 3,
    ]);
  });

  it('moves the highest-ranked item with a backdrop to the front', () => {
    expect(
      ranks(leadFirst([item(1), item(2), item(3, 'c'), item(4, 'd')])),
    ).toEqual([3, 1, 2, 4]);
  });

  it('sorts by rank first, so a filtered or shuffled list still leads right', () => {
    expect(ranks(leadFirst([item(5, 'e'), item(2), item(4, 'd')]))).toEqual([
      4, 2, 5,
    ]);
  });

  it('keeps rank order when none has a backdrop (no lead)', () => {
    expect(ranks(leadFirst([item(2), item(1)]))).toEqual([1, 2]);
  });

  it('treats an empty backdrop as none', () => {
    expect(ranks(leadFirst([item(1, ''), item(2, 'b')]))).toEqual([2, 1]);
  });
});
