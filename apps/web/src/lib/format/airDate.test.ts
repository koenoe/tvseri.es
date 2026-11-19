import { describe, expect, it } from 'vitest';

import { airDay, formatAirWeekdayDate, spokenAirDate } from './airDate';

const NOW = Date.UTC(2026, 10, 12);

describe('formatAirWeekdayDate (the one air-date wording)', () => {
  it('this year: weekday, day, month', () => {
    expect(formatAirWeekdayDate('2026-11-13', NOW)).toBe('Fri Nov 13');
    expect(formatAirWeekdayDate('2026-01-08T00:00:00Z', NOW)).toBe('Thu Jan 8');
  });

  it('another year: with the year', () => {
    expect(formatAirWeekdayDate('2027-01-08', NOW)).toBe('Jan 8, 2027');
    expect(formatAirWeekdayDate('2025-09-15', NOW)).toBe('Sep 15, 2025');
  });

  it('is empty for no date or one that does not exist', () => {
    expect(formatAirWeekdayDate('', NOW)).toBe('');
    expect(formatAirWeekdayDate('2024-02-30', NOW)).toBe('');
    expect(airDay('2024-02-29')).toEqual({ day: 29, month: 1, year: 2024 });
  });
});

describe("spokenAirDate (a screen reader's label)", () => {
  it('spells the weekday and month out', () => {
    expect(spokenAirDate('2026-11-20')).toBe('Friday November 20');
    expect(spokenAirDate('nope')).toBe('');
  });
});
