import { describe, expect, it } from 'vitest';

import { isSearchShortcut } from './shortcut';

const key = (
  k: string,
  mods: Partial<
    Record<'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey', boolean>
  > = {},
) => ({
  altKey: false,
  ctrlKey: false,
  key: k,
  metaKey: false,
  shiftKey: false,
  ...mods,
});

describe('isSearchShortcut', () => {
  it('⌘K and ⌘F on a Mac', () => {
    expect(isSearchShortcut(key('k', { metaKey: true }), true)).toBe(true);
    expect(isSearchShortcut(key('f', { metaKey: true }), true)).toBe(true);
    expect(isSearchShortcut(key('k', { ctrlKey: true }), true)).toBe(false);
  });

  it('Ctrl+K and Ctrl+F elsewhere', () => {
    expect(isSearchShortcut(key('k', { ctrlKey: true }), false)).toBe(true);
    expect(isSearchShortcut(key('F', { ctrlKey: true }), false)).toBe(true);
    expect(isSearchShortcut(key('k', { metaKey: true }), false)).toBe(false);
  });

  it('not other keys or extra modifiers', () => {
    expect(isSearchShortcut(key('k'), true)).toBe(false);
    expect(isSearchShortcut(key('j', { metaKey: true }), true)).toBe(false);
    expect(
      isSearchShortcut(key('f', { metaKey: true, shiftKey: true }), true),
    ).toBe(false);
    expect(
      isSearchShortcut(key('k', { altKey: true, metaKey: true }), true),
    ).toBe(false);
  });
});
