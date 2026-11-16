// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { holdScrollLock, lockScroll, unlockScroll } from './scrollLock';

const root = document.documentElement;

/** The page's width before and after the lock (jsdom lays nothing out) */
const widths = (before: number, after: number) =>
  vi
    .spyOn(root, 'getBoundingClientRect')
    .mockImplementation(
      () => ({ width: root.style.overflow ? after : before }) as DOMRect,
    );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('lockScroll', () => {
  it('gives a classic scroll bar’s lost width back, so nothing moves', () => {
    widths(1425, 1440);
    lockScroll();
    expect(root.style.overflow).toBe('hidden');
    expect(root.style.paddingRight).toBe('15px');
    expect(root.style.getPropertyValue('--scroll-lock-gap')).toBe('15px');

    unlockScroll();
    expect(root.style.overflow).toBe('');
    expect(root.style.paddingRight).toBe('');
    expect(root.style.getPropertyValue('--scroll-lock-gap')).toBe('');
  });

  it('adds nothing for overlay scroll bars or a kept gutter', () => {
    widths(1440, 1440);
    lockScroll();
    expect(root.style.paddingRight).toBe('');
    expect(root.style.getPropertyValue('--scroll-lock-gap')).toBe('');
    unlockScroll();
  });

  it('is counted: the page unlocks with the last one', () => {
    widths(1440, 1440);
    lockScroll();
    lockScroll();
    unlockScroll();
    expect(root.style.overflow).toBe('hidden');
    unlockScroll();
    expect(root.style.overflow).toBe('');
  });
});

describe('holdScrollLock', () => {
  it('locks while its element is mounted and counts with the others', () => {
    widths(1440, 1440);
    const release = holdScrollLock(document.createElement('span'));
    expect(root.style.overflow).toBe('hidden');
    // a dialog opened from the popover, then the popover closing under it
    lockScroll();
    release?.();
    expect(root.style.overflow).toBe('hidden');
    unlockScroll();
    expect(root.style.overflow).toBe('');
  });

  it('does nothing without an element', () => {
    expect(holdScrollLock(null)).toBe(undefined);
    expect(root.style.overflow).toBe('');
  });
});
