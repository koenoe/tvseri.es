import { describe, expect, it } from 'vitest';

import { dayKeyIn, startOfDayIn, zonedParts } from './zoned';

const at = (iso: string) => Date.parse(iso);

describe('zonedParts', () => {
  it('reads the wall clock in the zone, midnight as hour 0, Monday as 0', () => {
    expect(zonedParts(at('2026-03-29T00:30:00Z'), 'Europe/London')).toEqual({
      day: 29,
      hour: 0,
      minute: 30,
      month: 3,
      second: 0,
      weekday: 6,
      year: 2026,
    });
    // after the clocks go forward: BST
    expect(
      zonedParts(at('2026-03-29T01:30:00Z'), 'Europe/London'),
    ).toMatchObject({ hour: 2, minute: 30 });
    expect(zonedParts(at('2026-11-16T23:00:00Z'), 'Asia/Tokyo')).toMatchObject({
      day: 17,
      hour: 8,
      weekday: 1,
    });
  });
});

describe('dayKeyIn', () => {
  it('is the day the instant falls on in the zone', () => {
    const instant = at('2026-11-16T23:30:00Z');
    expect(dayKeyIn(instant, 'UTC')).toBe('2026-11-16');
    expect(dayKeyIn(instant, 'Europe/Amsterdam')).toBe('2026-11-17');
    expect(dayKeyIn(instant, 'America/New_York')).toBe('2026-11-16');
  });

  it('handles the extreme offsets (+14, -11)', () => {
    const instant = at('2026-06-01T10:30:00Z');
    expect(dayKeyIn(instant, 'Pacific/Kiritimati')).toBe('2026-06-02');
    expect(dayKeyIn(instant, 'Pacific/Pago_Pago')).toBe('2026-05-31');
  });

  it('skips the day Samoa skipped', () => {
    // Pacific/Apia jumped from 29 to 31 December 2011
    expect(dayKeyIn(at('2011-12-30T09:59:59Z'), 'Pacific/Apia')).toBe(
      '2011-12-29',
    );
    expect(dayKeyIn(at('2011-12-30T10:00:00Z'), 'Pacific/Apia')).toBe(
      '2011-12-31',
    );
  });
});

describe('startOfDayIn', () => {
  it('is local midnight', () => {
    expect(startOfDayIn('2026-07-01', 'Europe/London')).toBe(
      at('2026-06-30T23:00:00Z'),
    );
    expect(startOfDayIn('2026-01-01', 'Europe/London')).toBe(
      at('2026-01-01T00:00:00Z'),
    );
    expect(startOfDayIn('2026-06-01', 'Asia/Kolkata')).toBe(
      at('2026-05-31T18:30:00Z'),
    );
  });

  it('is exact across a DST change', () => {
    // the day the clocks go forward and back in London
    expect(startOfDayIn('2026-03-29', 'Europe/London')).toBe(
      at('2026-03-29T00:00:00Z'),
    );
    expect(startOfDayIn('2026-03-30', 'Europe/London')).toBe(
      at('2026-03-29T23:00:00Z'),
    );
    expect(startOfDayIn('2026-10-26', 'Europe/London')).toBe(
      at('2026-10-26T00:00:00Z'),
    );
  });

  it('lands an hour early where midnight itself is skipped (kept as it was)', () => {
    // Chile moves its clocks forward at midnight on 6 September 2026: the
    // day starts at 01:00 local (04:00 UTC); the two passes answer 03:00 UTC,
    // 23:00 the evening before. Only a month starting on such a day would
    // be affected (the diary asks for month starts)
    expect(startOfDayIn('2026-09-06', 'America/Santiago')).toBe(
      at('2026-09-06T03:00:00Z'),
    );
  });
});
