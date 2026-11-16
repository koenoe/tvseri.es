import { describe, expect, it } from 'vitest';

import { isPlainClick } from './isPlainClick';

const click = {
  altKey: false,
  button: 0,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
};

describe('isPlainClick', () => {
  it('is true for a primary click without modifiers', () => {
    expect(isPlainClick(click)).toBe(true);
  });

  it.each([
    ['a middle click', { button: 1 }],
    ['⌘', { metaKey: true }],
    ['Ctrl', { ctrlKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
  ])('is false for %s', (_, change) => {
    expect(isPlainClick({ ...click, ...change })).toBe(false);
  });
});
