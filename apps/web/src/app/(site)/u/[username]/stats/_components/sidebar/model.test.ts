import { describe, expect, it } from 'vitest';

import { visiblePills, yearLabel } from './model';

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
