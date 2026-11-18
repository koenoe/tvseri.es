import { describe, expect, it } from 'vitest';

import { visiblePills, visibleYears, yearLabel } from './model';

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

  it('hides nothing when the sixth and last year is the page year', () => {
    expect(visibleYears(years.slice(0, 6), 2021, 5)).toEqual({
      hidden: false,
      years: [...newest, 2021],
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

describe('yearLabel', () => {
  it('says "so far" for the year in progress only', () => {
    expect(yearLabel(2026, 'current')).toBe('2026 so far');
    expect(yearLabel(2025, 'finished')).toBe('2025');
  });
});

describe('visiblePills', () => {
  const years = [2026, 2025, 2024, 2023, 2022];

  it('shows the newest three with More when there are more', () => {
    expect(visiblePills(years, 2026, 3)).toEqual({
      more: true,
      years: [2026, 2025, 2024],
    });
  });

  it('keeps the page year in the row, in place of the last pill', () => {
    expect(visiblePills(years, 2022, 3)).toEqual({
      more: true,
      years: [2026, 2025, 2022],
    });
  });

  it('shows them all, still with More (the full list with counts)', () => {
    expect(visiblePills([2026, 2025, 2024], 2025, 3)).toEqual({
      more: true,
      years: [2026, 2025, 2024],
    });
  });

  it('has no More for a single year', () => {
    expect(visiblePills([2025], 2025, 3)).toEqual({
      more: false,
      years: [2025],
    });
  });

  it('ignores a page year that is not in the list', () => {
    expect(visiblePills(years, 2030, 3)).toEqual({
      more: true,
      years: [2026, 2025, 2024],
    });
  });
});
