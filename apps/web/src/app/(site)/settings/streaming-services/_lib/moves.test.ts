import { describe, expect, it } from 'vitest';

import { movesFor } from './moves';

const labels = (index: number, count: number) =>
  movesFor(index, count).map((move) => `${move.label} ${move.to}`);

describe('movesFor', () => {
  it('offers every move from the middle', () => {
    expect(labels(2, 5)).toEqual([
      'Move to top 0',
      'Move up 1',
      'Move down 3',
      'Move to bottom 4',
    ]);
  });

  it('leaves out the moves that would do nothing or repeat one', () => {
    expect(labels(0, 5)).toEqual(['Move down 1', 'Move to bottom 4']);
    expect(labels(1, 3)).toEqual(['Move up 0', 'Move down 2']);
    expect(labels(4, 5)).toEqual(['Move to top 0', 'Move up 3']);
    expect(labels(0, 1)).toEqual([]);
  });
});
