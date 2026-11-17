import { describe, expect, it } from 'vitest';

import { withoutNeighbours } from './neighbours';

const show = (id: number) => ({ id });

describe('withoutNeighbours', () => {
  it('drops the shows a neighbouring section already shows, keeping order', () => {
    expect(
      withoutNeighbours([show(1), show(2), show(3), show(4)], [[2], [4]]),
    ).toEqual([show(1), show(3)]);
  });

  it('takes the next shows in the list to fill the limit', () => {
    expect(
      withoutNeighbours([show(1), show(2), show(3), show(4)], [[1]], 2),
    ).toEqual([show(2), show(3)]);
  });

  it('keeps everything when the neighbours share nothing', () => {
    expect(withoutNeighbours([show(5), show(6)], [[1, 2], []])).toEqual([
      show(5),
      show(6),
    ]);
  });

  it('never repeats a show within the list itself', () => {
    expect(withoutNeighbours([show(1), show(1), show(2)], [])).toEqual([
      show(1),
      show(2),
    ]);
  });
});
