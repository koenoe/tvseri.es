import { describe, expect, it } from 'vitest';

import { detectDateOrder, parseDate } from './parseDate';

/** Local noon, the way the importer stores a day */
const noon = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12).getTime();

const NOW = new Date(2026, 10, 12, 21, 40).getTime();

describe('detectDateOrder', () => {
  it('a first part above 12 means day-first', () => {
    expect(detectDateOrder(['05/06/24', '25/06/24'])).toBe('dmy');
  });

  it('a second part above 12 means month-first', () => {
    expect(detectDateOrder(['11/6/26', '11/21/26'])).toBe('mdy');
  });

  it('is unknown without evidence or with conflicting evidence', () => {
    expect(detectDateOrder(['11/6/26', '5/4/25'])).toBe('unknown');
    expect(detectDateOrder(['25/06/24', '06/25/24'])).toBe('unknown');
    expect(detectDateOrder([])).toBe('unknown');
  });

  it('is iso when every date is year-first; empty cells do not count', () => {
    expect(detectDateOrder(['2025-03-21', '', null, '2025-04-10'])).toBe('iso');
    expect(detectDateOrder(['2025-03-21', '5/4/25'])).toBe('unknown');
  });

  it('ignores non-text values', () => {
    expect(detectDateOrder([undefined, 3, new Date()])).toBe('unknown');
  });
});

describe('parseDate', () => {
  it('reads Netflix M/d/yy month-first without evidence, flagged as assumed', () => {
    expect(parseDate('11/6/26', 'unknown', NOW)).toEqual({
      isAssumed: true,
      watchedAt: noon(2026, 11, 6),
    });
  });

  it('reads day-first and month-first by the file order, not assumed', () => {
    expect(parseDate('5/6/24', 'dmy', NOW)).toEqual({
      watchedAt: noon(2024, 6, 5),
    });
    expect(parseDate('5/6/24', 'mdy', NOW)).toEqual({
      watchedAt: noon(2024, 5, 6),
    });
  });

  it('reads dotted and dashed numeric dates day-first when unknown', () => {
    expect(parseDate('05.06.2024', 'unknown', NOW)).toEqual({
      isAssumed: true,
      watchedAt: noon(2024, 6, 5),
    });
    expect(parseDate('05-06-2024', 'unknown', NOW)).toEqual({
      isAssumed: true,
      watchedAt: noon(2024, 6, 5),
    });
  });

  it('a part above 12 decides for itself; equal parts are not assumed', () => {
    expect(parseDate('25/6/24', 'unknown', NOW)).toEqual({
      watchedAt: noon(2024, 6, 25),
    });
    expect(parseDate('6/6/24', 'unknown', NOW)).toEqual({
      watchedAt: noon(2024, 6, 6),
    });
  });

  it('reads ISO dates, with or without a time, at local noon', () => {
    expect(parseDate('2025-03-21', 'iso', NOW)).toEqual({
      watchedAt: noon(2025, 3, 21),
    });
    expect(parseDate('2025-03-21T23:59:00Z', 'iso', NOW)).toEqual({
      watchedAt: noon(2025, 3, 21),
    });
    expect(parseDate('2025-03-21 23:59:00', 'iso', NOW)).toEqual({
      watchedAt: noon(2025, 3, 21),
    });
  });

  it('takes 29 February only in a leap year', () => {
    expect(parseDate('29/02/24', 'dmy', NOW)).toEqual({
      watchedAt: noon(2024, 2, 29),
    });
    expect(parseDate('29/02/23', 'dmy', NOW)).toEqual({ error: 'not-a-date' });
  });

  it('reads month names', () => {
    expect(parseDate('21 Mar 2025', 'unknown', NOW)).toEqual({
      watchedAt: noon(2025, 3, 21),
    });
    expect(parseDate('March 21, 2025', 'unknown', NOW)).toEqual({
      watchedAt: noon(2025, 3, 21),
    });
  });

  it('two-digit years are 20xx', () => {
    expect(parseDate('3/21/05', 'mdy', NOW)).toEqual({
      watchedAt: noon(2005, 3, 21),
    });
  });

  it('refuses impossible dates', () => {
    expect(parseDate('31/02/24', 'dmy', NOW)).toEqual({ error: 'not-a-date' });
    expect(parseDate('2025-13-01', 'iso', NOW)).toEqual({
      error: 'not-a-date',
    });
    expect(parseDate('13/13/24', 'unknown', NOW)).toEqual({
      error: 'not-a-date',
    });
    expect(parseDate('Feb 30, 2024', 'unknown', NOW)).toEqual({
      error: 'not-a-date',
    });
  });

  it('refuses text that is not a date', () => {
    expect(parseDate('yesterday', 'unknown', NOW)).toEqual({
      error: 'not-a-date',
    });
    expect(parseDate('Foo 12, 2020', 'unknown', NOW)).toEqual({
      error: 'not-a-date',
    });
    expect(parseDate(new Date('nope'), 'unknown', NOW)).toEqual({
      error: 'not-a-date',
    });
  });

  it('takes the first day of 2000, the earliest the API accepts', () => {
    expect(parseDate('2000-01-01', 'iso', NOW)).toEqual({
      watchedAt: noon(2000, 1, 1),
    });
  });

  it('refuses a date before 2000: Before 2000', () => {
    expect(parseDate('1999-12-31', 'iso', NOW)).toEqual({
      error: 'before-2000',
    });
    expect(parseDate('12/31/1999', 'mdy', NOW)).toEqual({
      error: 'before-2000',
    });
    expect(parseDate(new Date(1999, 0, 1), 'unknown', NOW)).toEqual({
      error: 'before-2000',
    });
  });

  it('refuses a date after tomorrow: In the future', () => {
    // the day after tomorrow is the first one refused
    expect(parseDate('2026-11-14', 'iso', NOW)).toEqual({ error: 'future' });
    expect(parseDate('2026-11-15', 'iso', NOW)).toEqual({ error: 'future' });
    expect(parseDate('11/21/26', 'mdy', NOW)).toEqual({ error: 'future' });
    expect(parseDate('11/6/99', 'mdy', NOW)).toEqual({ error: 'future' });
  });

  it('takes today and tomorrow (a day of slack for time zones)', () => {
    expect(parseDate('2026-11-12', 'iso', NOW)).toEqual({
      watchedAt: noon(2026, 11, 12),
    });
    expect(parseDate('2026-11-13', 'iso', NOW)).toEqual({
      watchedAt: noon(2026, 11, 13),
    });
  });

  it('an empty date is "I don’t remember", not an error', () => {
    for (const empty of ['', '   ', null, undefined]) {
      expect(parseDate(empty, 'unknown', NOW)).toEqual({ watchedAt: null });
    }
  });

  it('keeps a Date from dynamic typing, refusing the future too', () => {
    const time = noon(2025, 3, 21);
    expect(parseDate(new Date(time), 'iso', NOW)).toEqual({ watchedAt: time });
    expect(parseDate(new Date(NOW + 5 * 24 * 3600_000), 'iso', NOW)).toEqual({
      error: 'future',
    });
  });
});
