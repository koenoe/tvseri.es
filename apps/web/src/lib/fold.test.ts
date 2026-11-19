import { describe, expect, it } from 'vitest';

import { foldOf, shouldFold, visibleYears } from './fold';

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

describe('visibleYears', () => {
  const years = Array.from({ length: 21 }, (_, index) => 2026 - index);
  const newest = [2026, 2025, 2024, 2023, 2022];

  it('shows the newest five, the rest folded', () => {
    expect(visibleYears(years, 2026, 5)).toEqual({
      hidden: true,
      years: newest,
    });
  });

  it('adds an older page year in its place, after the newest five', () => {
    expect(visibleYears(years, 2010, 5)).toEqual({
      hidden: true,
      years: [...newest, 2010],
    });
  });

  it('shows five or fewer years whole', () => {
    expect(visibleYears(newest, 2022, 5)).toEqual({
      hidden: false,
      years: newest,
    });
  });

  it('shows a short tail whole: three or fewer left out never fold', () => {
    const eight = years.slice(0, 8);
    expect(visibleYears(eight, 2026, 5)).toEqual({
      hidden: false,
      years: eight,
    });
    expect(visibleYears(years.slice(0, 9), 2026, 5)).toEqual({
      hidden: true,
      years: newest,
    });
  });

  it('ignores a page year that is not in the list, or none', () => {
    expect(visibleYears(years, 1999, 5)).toEqual({
      hidden: true,
      years: newest,
    });
    expect(visibleYears(years, null, 5)).toEqual({
      hidden: true,
      years: newest,
    });
  });
});
