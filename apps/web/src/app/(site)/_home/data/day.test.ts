import { describe, expect, it } from 'vitest';

import {
  addDays,
  apiDate,
  daysBetween,
  isInApiWindow,
  monthName,
  utcDay,
} from './day';

describe('utcDay', () => {
  it('is the UTC calendar day', () => {
    expect(utcDay(new Date('2026-11-11T23:30:00-05:00'))).toBe('2026-11-12');
  });
});

describe('addDays', () => {
  it('moves a day across a month end, both ways', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-01', -3)).toBe('2026-11-28');
  });
});

describe('monthName', () => {
  it('names the month of a day', () => {
    expect(monthName('2026-11-11')).toBe('November');
    expect(monthName('2027-01-01')).toBe('January');
  });
});

describe('daysBetween', () => {
  it('counts calendar days from one UTC day to another', () => {
    expect(daysBetween('2026-11-11', '2026-11-11')).toBe(0);
    expect(daysBetween('2026-11-11', '2026-11-12')).toBe(1);
    expect(daysBetween('2026-11-11', '2026-12-02')).toBe(21);
    expect(daysBetween('2026-11-12', '2026-11-11')).toBe(-1);
  });
});

describe('the API window (the dev preview of other days)', () => {
  const now = new Date('2026-11-13T12:00:00Z');

  it('answers yesterday, today and tomorrow (UTC) only', () => {
    expect(isInApiWindow('2026-11-12', now)).toBe(true);
    expect(isInApiWindow('2026-11-13', now)).toBe(true);
    expect(isInApiWindow('2026-11-14', now)).toBe(true);
    expect(isInApiWindow('2026-11-15', now)).toBe(false);
    expect(isInApiWindow('2026-11-11', now)).toBe(false);
  });

  it('sends the day itself whenever the API can answer for it', () => {
    expect(apiDate(utcDay(new Date()))).toBe(utcDay(new Date()));
  });
});
