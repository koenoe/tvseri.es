import { describe, expect, it } from 'vitest';

import { moveInGrid, shortcutTarget } from './grid';

// The show page Remote: the big key (row 1), E F W (row 2).
const SHOW = [1, 3];
// The show page with the admin row: two more keys (row 3).
const ADMIN = [1, 3, 2];

describe('moveInGrid', () => {
  it('↓ and → go from the big key to the first small key', () => {
    expect(moveInGrid(SHOW, 0, 'ArrowDown')).toBe(1);
    expect(moveInGrid(SHOW, 0, 'ArrowRight')).toBe(1);
  });

  it('→ and ← walk the keys in order and stop at the ends', () => {
    expect(moveInGrid(SHOW, 1, 'ArrowRight')).toBe(2);
    expect(moveInGrid(SHOW, 3, 'ArrowRight')).toBe(3);
    expect(moveInGrid(SHOW, 2, 'ArrowLeft')).toBe(1);
    expect(moveInGrid(SHOW, 1, 'ArrowLeft')).toBe(0);
    expect(moveInGrid(SHOW, 0, 'ArrowLeft')).toBe(0);
  });

  it('↑ from any small key goes back to the big key; ↓ on the last row stays', () => {
    expect(moveInGrid(SHOW, 3, 'ArrowUp')).toBe(0);
    expect(moveInGrid(SHOW, 0, 'ArrowUp')).toBe(0);
    expect(moveInGrid(SHOW, 2, 'ArrowDown')).toBe(2);
  });

  it('Home and End jump to the first and the last key', () => {
    expect(moveInGrid(SHOW, 2, 'Home')).toBe(0);
    expect(moveInGrid(SHOW, 0, 'End')).toBe(3);
  });

  it('with nothing focused (opened by mouse) moves as if on the big key', () => {
    expect(moveInGrid(SHOW, -1, 'ArrowDown')).toBe(1);
    expect(moveInGrid(SHOW, -1, 'ArrowRight')).toBe(1);
    expect(moveInGrid(SHOW, -1, 'ArrowUp')).toBe(0);
    expect(moveInGrid(SHOW, -1, 'ArrowLeft')).toBe(0);
  });

  it('keeps the column between rows, clamped to the shorter row', () => {
    expect(moveInGrid(ADMIN, 2, 'ArrowDown')).toBe(5);
    expect(moveInGrid(ADMIN, 3, 'ArrowDown')).toBe(5);
    expect(moveInGrid(ADMIN, 1, 'ArrowDown')).toBe(4);
    expect(moveInGrid(ADMIN, 5, 'ArrowUp')).toBe(2);
    expect(moveInGrid(ADMIN, 4, 'ArrowUp')).toBe(1);
  });

  it('works for the tile (big key, E H)', () => {
    expect(moveInGrid([1, 2], 0, 'ArrowDown')).toBe(1);
    expect(moveInGrid([1, 2], 1, 'ArrowRight')).toBe(2);
    expect(moveInGrid([1, 2], 2, 'ArrowUp')).toBe(0);
  });

  it('returns null for keys that are not navigation', () => {
    expect(moveInGrid(SHOW, 0, 'Enter')).toBeNull();
    expect(moveInGrid(SHOW, 0, 'f')).toBeNull();
  });
});

describe('shortcutTarget', () => {
  const keys = ['N', 'E', 'F', 'W', undefined];
  const plain = { altKey: false, ctrlKey: false, metaKey: false };

  it('finds the key for a letter, either case', () => {
    expect(shortcutTarget(keys, { ...plain, key: 'f' })).toBe(2);
    expect(shortcutTarget(keys, { ...plain, key: 'W' })).toBe(3);
    expect(shortcutTarget(keys, { ...plain, key: 'n' })).toBe(0);
  });

  it('ignores letters without a key and browser shortcuts', () => {
    expect(shortcutTarget(keys, { ...plain, key: 'x' })).toBe(-1);
    expect(shortcutTarget(keys, { ...plain, key: 'f', metaKey: true })).toBe(
      -1,
    );
    expect(shortcutTarget(keys, { ...plain, ctrlKey: true, key: 'w' })).toBe(
      -1,
    );
    expect(shortcutTarget(keys, { ...plain, altKey: true, key: 'e' })).toBe(-1);
  });
});
