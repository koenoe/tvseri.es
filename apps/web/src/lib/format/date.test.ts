import { describe, expect, it } from 'vitest';

import {
  DATE_ORDER,
  dateFormats,
  dayMonth,
  formatMonthYear,
  formatWeekdayDate,
  utcParts,
} from './date';

describe('formatMonthYear', () => {
  it('writes the short month and the year, in UTC', () => {
    expect(formatMonthYear('2025-03-01')).toBe('Mar 2025');
    expect(formatMonthYear('2024-03-31T23:30:00.000Z')).toBe('Mar 2024');
    expect(formatMonthYear(Date.UTC(2026, 10, 12))).toBe('Nov 2026');
  });

  it('writes September as Sep', () => {
    expect(formatMonthYear('2024-09-03')).toBe('Sep 2024');
  });
});

describe('formatWeekdayDate', () => {
  it.each([
    ['2026-01-06', 'Tue Jan 6'],
    ['2026-02-03', 'Tue Feb 3'],
    ['2026-03-03', 'Tue Mar 3'],
    ['2026-04-07', 'Tue Apr 7'],
    ['2026-05-05', 'Tue May 5'],
    ['2026-06-02', 'Tue Jun 2'],
    ['2026-07-07', 'Tue Jul 7'],
    ['2026-08-04', 'Tue Aug 4'],
    ['2026-09-15', 'Tue Sep 15'],
    ['2026-10-06', 'Tue Oct 6'],
    ['2026-11-17', 'Tue Nov 17'],
    ['2026-12-01', 'Tue Dec 1'],
  ])('writes %s as %s (three-letter months, no commas)', (day, expected) => {
    expect(formatWeekdayDate(day, { timeZone: 'UTC' })).toBe(expected);
  });

  it('adds the year on request', () => {
    expect(
      formatWeekdayDate('2027-09-30', { timeZone: 'UTC', withYear: true }),
    ).toBe('Thu Sep 30, 2027');
  });

  it('takes a timestamp or a Date', () => {
    const at = Date.UTC(2026, 8, 6, 12);

    expect(formatWeekdayDate(at, { timeZone: 'UTC' })).toBe('Sun Sep 6');
    expect(formatWeekdayDate(new Date(at), { timeZone: 'UTC' })).toBe(
      'Sun Sep 6',
    );
  });

  it('reads the day in the given zone', () => {
    const lateUtc = Date.UTC(2026, 8, 30, 23, 30);

    expect(formatWeekdayDate(lateUtc, { timeZone: 'UTC' })).toBe('Wed Sep 30');
    expect(formatWeekdayDate(lateUtc, { timeZone: 'Europe/Amsterdam' })).toBe(
      'Thu Oct 1',
    );
    expect(
      formatWeekdayDate(lateUtc, {
        timeZone: 'America/New_York',
        withYear: true,
      }),
    ).toBe('Wed Sep 30, 2026');
  });

  it('throws on an invalid date', () => {
    expect(() => formatWeekdayDate('not a date', { timeZone: 'UTC' })).toThrow(
      RangeError,
    );
  });
});

describe('the order, both ways (DATE_ORDER picks one for the app)', () => {
  const day = { day: 8, month: 10, year: 2025 };
  const us = dateFormats('us');
  const uk = dateFormats('uk');

  it('writes a day and a day with its year', () => {
    expect(us.dayMonth(day)).toBe('Nov 8');
    expect(us.dayMonthYear(day)).toBe('Nov 8, 2025');
    expect(uk.dayMonth(day)).toBe('8 Nov');
    expect(uk.dayMonthYear(day)).toBe('8 Nov 2025');
  });

  it('writes the weekday forms', () => {
    expect(us.weekdayDayMonth(day, 6)).toBe('Sat Nov 8');
    expect(us.weekdayDayMonthYear(day, 6)).toBe('Sat Nov 8, 2025');
    expect(uk.weekdayDayMonth(day, 6)).toBe('Sat 8 Nov');
    expect(uk.weekdayDayMonthYear(day, 6)).toBe('Sat 8 Nov 2025');
    expect(us.longWeekdayMonthDay(day, 6)).toBe('Saturday November 8');
    expect(uk.longWeekdayMonthDay(day, 6)).toBe('Saturday 8 November');
  });

  it('writes ranges, year suffixes and patterns', () => {
    const from = { day: 10, month: 10 };
    expect(us.dayRangeText(from, { day: 16, month: 10 })).toBe('Nov 10 – 16');
    expect(us.dayRangeText({ day: 29, month: 11 }, { day: 4, month: 0 })).toBe(
      'Dec 29 – Jan 4',
    );
    expect(uk.dayRangeText(from, { day: 16, month: 10 })).toBe('10 – 16 Nov');
    expect(uk.dayRangeText({ day: 29, month: 11 }, { day: 4, month: 0 })).toBe(
      '29 Dec – 4 Jan',
    );
    expect(us.yearSuffix(2025)).toBe(', 2025');
    expect(uk.yearSuffix(2025)).toBe(' 2025');
    expect([us.weekdayPattern, uk.weekdayPattern]).toEqual([
      'EEE MMM d',
      'EEE d MMM',
    ]);
  });

  it('the app uses the one DATE_ORDER names', () => {
    expect(dayMonth(day)).toBe(dateFormats(DATE_ORDER).dayMonth(day));
    expect(utcParts(new Date(Date.UTC(2026, 0, 1, 23)))).toEqual({
      day: 1,
      month: 0,
      year: 2026,
    });
  });
});
