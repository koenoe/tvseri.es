import { format, parseISO } from 'date-fns';
import { afterEach, describe, expect, it } from 'vitest';

import { formatDay, formatLocalDate } from './datePattern';

/** Every pattern the app writes through these helpers */
const PATTERNS = [
  'EEEE',
  'EEE MMM d',
  'EEE d MMM',
  'EEE d MMM yyyy',
  'MMM',
  'MMM d',
  'MMM d, yyyy',
  'MMMM yyyy',
  'yyyy-MM-dd',
];

/** Zones far apart, and ones whose midnight moves with daylight saving */
const ZONES = [
  'UTC',
  'Europe/Amsterdam',
  'America/Los_Angeles',
  'Pacific/Kiritimati',
  'Pacific/Pago_Pago',
];

/** Every calendar day from Dec 2027 to Jan 2029 (a leap year, two year ends) */
const DAYS = Array.from({ length: 400 }, (_, index) =>
  new Date(Date.UTC(2027, 11, 1) + index * 86_400_000)
    .toISOString()
    .slice(0, 10),
);

const zone = process.env.TZ;
afterEach(() => {
  process.env.TZ = zone;
});

describe('formatDay', () => {
  it('writes every day as date-fns does, in every zone', () => {
    for (const tz of ZONES) {
      process.env.TZ = tz;
      for (const day of DAYS) {
        for (const pattern of PATTERNS) {
          expect(formatDay(day, pattern), `${tz} ${day} ${pattern}`).toBe(
            format(parseISO(day), pattern.replace(' ', "' '")),
          );
        }
      }
    }
  });

  it('throws on what is not a calendar day, as date-fns does', () => {
    expect(() => formatDay('', 'MMM d')).toThrow(RangeError);
    expect(() => formatDay('2026-02-30x', 'MMM d')).toThrow(RangeError);
    expect(() => formatDay('soon', 'MMM d')).toThrow(RangeError);
  });
});

describe('formatLocalDate', () => {
  it('writes every moment in the runtime zone as date-fns does', () => {
    for (const tz of ZONES) {
      process.env.TZ = tz;
      for (const day of DAYS) {
        // late evening UTC: the next day already in the zones east of it
        const moment = Date.parse(`${day}T22:30:00Z`);
        for (const pattern of PATTERNS) {
          expect(
            formatLocalDate(moment, pattern),
            `${tz} ${day} ${pattern}`,
          ).toBe(format(moment, pattern.replace(' ', "' '")));
          expect(formatLocalDate(new Date(moment), pattern)).toBe(
            format(new Date(moment), pattern.replace(' ', "' '")),
          );
        }
      }
    }
  });

  it('throws on an invalid date, as date-fns does', () => {
    expect(() => formatLocalDate(Number.NaN, 'MMM d')).toThrow(RangeError);
  });
});
