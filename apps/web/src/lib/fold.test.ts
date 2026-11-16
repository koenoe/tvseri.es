import { describe, expect, it } from 'vitest';

import { foldOf, shouldFold } from './fold';

describe('the fold rule', () => {
  it('folds a desktop list only when more than three would hide', () => {
    expect(shouldFold(3, 'desktop')).toBe(false);
    expect(shouldFold(4, 'desktop')).toBe(true);
  });

  it('folds a phone list only when more than two would hide', () => {
    expect(shouldFold(2, 'phone')).toBe(false);
    expect(shouldFold(3, 'phone')).toBe(true);
  });

  it('names where a list with one preview folds', () => {
    expect(foldOf(0)).toBe('none');
    expect(foldOf(2)).toBe('none');
    expect(foldOf(3)).toBe('phone');
    expect(foldOf(4)).toBe('all');
  });
});
