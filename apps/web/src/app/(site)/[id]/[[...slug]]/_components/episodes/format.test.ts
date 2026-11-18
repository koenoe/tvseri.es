import { describe, expect, it } from 'vitest';
import {
  airWeekday,
  airYear,
  formatAirDate,
  formatCountdown,
  formatMonthYear,
  formatWatchedDay,
} from './format';

// Thu 12 Nov 2026, 12:00 UTC
const utc = { now: Date.UTC(2026, 10, 12, 12) };

describe('air dates', () => {
  it('formats with the year, in UTC', () => {
    expect(formatAirDate('2024-06-26')).toBe('Jun 26, 2024');
    expect(formatAirDate('2026-10-02T00:00:00.000Z')).toBe('Oct 2, 2026');
    expect(formatAirDate('')).toBe('');
  });

  it('knows the weekday and year', () => {
    expect(airWeekday('2026-11-13')).toBe('Fri');
    expect(airYear('2027-03-01')).toBe('2027');
    expect(airYear('')).toBe('');
  });

  it('counts down to an upcoming episode', () => {
    expect(formatCountdown('2026-11-13', utc)).toBe('Fri · tomorrow');
    expect(formatCountdown('2026-11-15', utc)).toBe('Sun · in 3 days');
    expect(formatCountdown('2026-11-12', utc)).toBe('Thu · today');
    expect(formatCountdown('', utc)).toBe('Date to be announced');
    expect(formatCountdown('2026-11-13', { now: null })).toBe('Fri · Nov 13');
  });
});

describe('watched dates', () => {
  it('says today and yesterday', () => {
    expect(formatWatchedDay(Date.UTC(2026, 10, 12, 8), utc)).toBe('Today');
    expect(formatWatchedDay(Date.UTC(2026, 10, 11, 23), utc)).toBe('Yesterday');
    expect(formatWatchedDay(Date.UTC(2026, 10, 11, 23), utc, false)).toBe(
      'yesterday',
    );
  });

  it('drops the year this year and keeps it before', () => {
    expect(formatWatchedDay(Date.UTC(2026, 6, 2, 20), utc)).toBe('Jul 2');
    expect(formatWatchedDay(Date.UTC(2025, 6, 2, 20), utc)).toBe('Jul 2, 2025');
  });

  it('formats in the viewer zone when local', () => {
    const now = new Date(2026, 10, 12, 12).getTime();
    const at = new Date(2026, 10, 11, 23, 30).getTime();
    expect(formatWatchedDay(at, { now })).toBe('Yesterday');
  });

  it('writes absolute dates without a now (the static shell)', () => {
    expect(formatWatchedDay(Date.UTC(2026, 10, 12, 8), { now: null })).toBe(
      'Nov 12, 2026',
    );
  });

  it('names a stack month', () => {
    expect(formatMonthYear(Date.UTC(2025, 6, 2, 20))).toBe('Jul 2025');
  });
});
