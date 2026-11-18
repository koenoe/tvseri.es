import { describe, expect, it } from 'vitest';

import { monthWindow } from './monthWindow';

const utc = (iso: string) => new Date(iso);

describe('monthWindow', () => {
  it('starts at midnight UTC on the 1st', () => {
    expect(monthWindow(utc('2026-11-14T09:30:00Z')).startDate).toEqual(
      utc('2026-11-01T00:00:00Z'),
    );
  });

  // GetMetricData's EndTime is exclusive: the window has to reach past the
  // last day, or that day's requests are never counted
  it('counts the last day of the month', () => {
    const now = utc('2026-11-30T18:00:00Z');
    const { endDate, startDate } = monthWindow(now);

    expect(startDate.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(endDate.getTime()).toBeGreaterThan(now.getTime());
    expect(endDate).toEqual(utc('2026-12-01T00:00:00Z'));
  });

  it('rolls over the year in December', () => {
    expect(monthWindow(utc('2026-12-31T23:59:59Z'))).toEqual({
      endDate: utc('2027-01-01T00:00:00Z'),
      startDate: utc('2026-12-01T00:00:00Z'),
    });
  });

  it('handles February in a leap year', () => {
    expect(monthWindow(utc('2028-02-29T12:00:00Z'))).toEqual({
      endDate: utc('2028-03-01T00:00:00Z'),
      startDate: utc('2028-02-01T00:00:00Z'),
    });
  });
});
