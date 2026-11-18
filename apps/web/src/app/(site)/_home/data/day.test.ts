import { todayUtc } from '@tvseri.es/utils';
import { describe, expect, it } from 'vitest';
import { apiDate, isInApiWindow, monthName } from './day';

describe('monthName', () => {
  it('names the month of a day', () => {
    expect(monthName('2026-11-11')).toBe('November');
    expect(monthName('2027-01-01')).toBe('January');
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
    expect(apiDate(todayUtc())).toBe(todayUtc());
  });
});
