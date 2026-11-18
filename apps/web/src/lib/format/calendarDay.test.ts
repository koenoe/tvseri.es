import { describe, expect, it } from 'vitest';

import { daysFrom, formatMonthDay, formatMonthDayYear } from './calendarDay';

// Thu 12 Nov 2026, 15:00 UTC
const NOW = Date.UTC(2026, 10, 12, 15);

describe('calendar days', () => {
  it('month and day in UTC', () => {
    expect(formatMonthDay(Date.UTC(2026, 10, 8, 23))).toBe('Nov 8');
  });

  it('month, day and year in UTC (person page, Remote note)', () => {
    expect(formatMonthDayYear('2027-07-02T00:00:00Z')).toBe('Jul 2, 2027');
    expect(formatMonthDayYear(new Date(Date.UTC(1956, 2, 7, 23)))).toBe(
      'Mar 7, 1956',
    );
  });

  it('counts whole UTC days', () => {
    expect(daysFrom('2026-11-14', NOW)).toBe(2);
    expect(daysFrom('2026-11-12', NOW)).toBe(0);
    expect(daysFrom(Date.UTC(2026, 10, 11, 23, 59), NOW)).toBe(-1);
  });
});
