import { describe, expect, it } from 'vitest';

import { spanOf, wallCapacity, wallLayout } from './wall';

const STORY = { cols: 8, gap: 10, left: 90, rows: 3, top: 760, width: 900 };
const SQUARE = { cols: 5, gap: 10, left: 552, rows: 4, top: 156, width: 456 };

const box = (cell: {
  left: number;
  top: number;
  width: number;
  height: number;
}) => [cell.left, cell.top, cell.width, cell.height];

describe('spanOf', () => {
  it('sizes by rank: #1 3 × 3, #2–3 2 × 2, the rest 1 × 1', () => {
    expect([0, 1, 2, 3, 9].map(spanOf)).toEqual([3, 2, 2, 1, 1]);
  });
});

describe('wallCapacity', () => {
  it('fits the top 10 on the story and the top 6 on the square', () => {
    expect(wallCapacity(STORY)).toBe(10);
    expect(wallCapacity(SQUARE)).toBe(6);
  });
});

describe('wallLayout', () => {
  it('places the story wall as the board draws it (STShare)', () => {
    const cells = wallLayout(STORY, 10);
    expect(cells.map(box)).toEqual([
      [90, 760, 331, 487],
      [431, 760, 218, 321],
      [659, 760, 218, 321],
      [886, 760, 104, 156],
      [886, 926, 104, 156],
      [431, 1091, 104, 156],
      [545, 1091, 104, 156],
      [659, 1091, 104, 156],
      [772, 1091, 104, 156],
      [886, 1091, 104, 156],
    ]);
    expect(cells.map((cell) => cell.radius)).toEqual([
      18, 14, 14, 10, 10, 10, 10, 10, 10, 10,
    ]);
  });

  it('places the square wall in the right column (5 × 4, top 6)', () => {
    expect(wallLayout(SQUARE, 6).map(box)).toEqual([
      [552, 156, 270, 394],
      [832, 156, 176, 260],
      [832, 426, 176, 260],
      [552, 560, 83, 125],
      [645, 560, 83, 125],
      [738, 560, 83, 125],
    ]);
  });

  it('drops cells from the end with fewer shows', () => {
    const cells = wallLayout(STORY, 4);
    expect(cells.map((cell) => cell.rank)).toEqual([0, 1, 2, 3]);
    expect(box(cells[3]!)).toEqual([886, 760, 104, 156]);
  });

  it('never places more posters than the grid holds', () => {
    expect(wallLayout(SQUARE, 10)).toHaveLength(6);
  });

  it('is empty without shows', () => {
    expect(wallLayout(STORY, 0)).toEqual([]);
  });
});
