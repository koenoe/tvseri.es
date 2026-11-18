import { describe, expect, it } from 'vitest';

import { moveSelection } from './moveSelection';

/** 3 people then 8 shows, four columns each (desktop) */
const MIXED = [
  { columns: 4, size: 3 },
  { columns: 4, size: 8 },
];

describe('moveSelection: the grid', () => {
  it('→ and ← move one cell, across blocks, and stop at the ends', () => {
    expect(moveSelection(MIXED, 0, 'ArrowRight')).toBe(1);
    expect(moveSelection(MIXED, 2, 'ArrowRight')).toBe(3);
    expect(moveSelection(MIXED, 10, 'ArrowRight')).toBe(10);
    expect(moveSelection(MIXED, 0, 'ArrowLeft')).toBe(0);
  });

  it('↓ moves a row inside a block', () => {
    // shows start at 3: show 0 → show 4
    expect(moveSelection(MIXED, 3, 'ArrowDown')).toBe(7);
  });

  it('↓ crosses from the people row to the same column in the posters', () => {
    expect(moveSelection(MIXED, 1, 'ArrowDown')).toBe(4);
    expect(moveSelection(MIXED, 2, 'ArrowDown')).toBe(5);
  });

  it('↑ crosses back to the same column, clamped to the shorter row', () => {
    // show 3 (column 4) → the people row has 3: the last face
    expect(moveSelection(MIXED, 6, 'ArrowUp')).toBe(2);
    expect(moveSelection(MIXED, 4, 'ArrowUp')).toBe(1);
  });

  it('↑ into a block lands on its last row', () => {
    const showsFirst = [
      { columns: 4, size: 6 },
      { columns: 4, size: 2 },
    ];
    // the first face → the poster in column 1 of the second row
    expect(moveSelection(showsFirst, 6, 'ArrowUp')).toBe(4);
  });

  it('↓ on the last row and ↑ on the first stay put', () => {
    expect(moveSelection(MIXED, 10, 'ArrowDown')).toBe(10);
    expect(moveSelection(MIXED, 0, 'ArrowUp')).toBe(0);
  });

  it('nothing marked yet: any arrow marks the first cell', () => {
    expect(moveSelection(MIXED, -1, 'ArrowDown')).toBe(0);
    expect(moveSelection(MIXED, -1, 'ArrowLeft')).toBe(0);
  });

  it('nothing to move to', () => {
    expect(moveSelection([], 0, 'ArrowDown')).toBe(-1);
  });
});

describe('moveSelection: a strip above a grid (search on a phone)', () => {
  const phone = [
    { columns: Number.POSITIVE_INFINITY, size: 3 },
    { columns: 3, size: 5 },
  ];

  it('↓ from any face goes to the poster row, same column where it exists', () => {
    expect(moveSelection(phone, 0, 'ArrowDown')).toBe(3);
    expect(moveSelection(phone, 2, 'ArrowDown')).toBe(5);
  });

  it('↑ from the posters goes back to the strip', () => {
    expect(moveSelection(phone, 4, 'ArrowUp')).toBe(1);
    expect(moveSelection(phone, 7, 'ArrowUp')).toBe(4);
  });
});

describe('moveSelection: one column', () => {
  const column = [{ columns: 1, size: 4 }];

  it('↓ and → go to the next cell, ↑ and ← to the previous', () => {
    expect(moveSelection(column, -1, 'ArrowDown')).toBe(0);
    expect(moveSelection(column, 0, 'ArrowDown')).toBe(1);
    expect(moveSelection(column, 1, 'ArrowRight')).toBe(2);
    expect(moveSelection(column, 3, 'ArrowDown')).toBe(3);
    expect(moveSelection(column, 2, 'ArrowUp')).toBe(1);
    expect(moveSelection(column, 0, 'ArrowLeft')).toBe(0);
  });
});

describe('moveSelection: Home and End', () => {
  it('jump to the first and the last cell of the whole grid', () => {
    expect(moveSelection(MIXED, 6, 'Home')).toBe(0);
    expect(moveSelection(MIXED, 1, 'End')).toBe(10);
  });
});

describe('moveSelection: wrap (a menu)', () => {
  const column = [{ columns: 1, size: 4 }];

  it('↓ on the last cell goes to the first, ↑ on the first to the last', () => {
    expect(moveSelection(column, 3, 'ArrowDown', { wrap: true })).toBe(0);
    expect(moveSelection(column, 0, 'ArrowUp', { wrap: true })).toBe(3);
    expect(moveSelection(column, 1, 'ArrowDown', { wrap: true })).toBe(2);
  });
});
