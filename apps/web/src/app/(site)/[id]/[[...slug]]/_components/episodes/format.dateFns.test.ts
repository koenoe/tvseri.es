import { format, parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { formatAirWeekdayDate } from '@/lib/format/airDate';

import { airDayStart, formatAirDate } from './format';

/**
 * The history sheet and episode modal format dates without date-fns
 * `format`, which would pull its en-US locale into their chunks. These pin
 * the formatters to its output, day by day, in the order `DATE_ORDER` names.
 */

const DAY_MS = 86_400_000;

/** Every calendar day from 2023 to 2026 as `YYYY-MM-DD` */
const DAYS = Array.from({ length: 4 * 366 }, (_, index) =>
  new Date(Date.UTC(2023, 0, 1) + index * DAY_MS).toISOString().slice(0, 10),
);

const NOW = Date.UTC(2026, 10, 12, 21, 40);

describe('the date-fns replacements', () => {
  it('air dates: "MMM d, yyyy"', () => {
    for (const day of DAYS) {
      expect(formatAirDate(day)).toBe(format(parseISO(day), 'MMM d, yyyy'));
    }
  });

  it('air dates: "EEE MMM d" this year, "MMM d, yyyy" in another', () => {
    for (const day of DAYS) {
      const pattern = day.startsWith('2026') ? 'EEE MMM d' : 'MMM d, yyyy';
      expect(formatAirWeekdayDate(day, NOW)).toBe(
        format(parseISO(day), pattern),
      );
    }
  });

  it('air dates: the start of the local day', () => {
    for (const day of DAYS) {
      expect(airDayStart(day)).toBe(parseISO(day).getTime());
    }
  });

  it('days that do not exist are not air dates', () => {
    expect(formatAirDate('2024-02-30')).toBe('');
    expect(formatAirDate('2024-13-01')).toBe('');
    expect(airDayStart('2025-02-29')).toBeNull();
    expect(formatAirDate('2024-02-29')).toBe('Feb 29, 2024');
  });
});
