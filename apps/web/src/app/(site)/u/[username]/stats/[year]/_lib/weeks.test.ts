import { describe, expect, it } from 'vitest';

import {
  dayRange,
  monthStarts,
  shortDay,
  weekIndexAt,
  weekLabel,
} from './weeks';

describe('weeks', () => {
  it('labels a week Monday to Sunday', () => {
    expect(weekLabel(2025, 1)).toBe('Jan 6 – Jan 12');
    expect(weekLabel(2026, 1)).toBe('Jan 5 – Jan 11');
    expect(weekLabel(2026, 8)).toBe('Feb 23 – Mar 1');
  });

  it('labels the days a bar counts: the year’s own, week 0 from 1 January', () => {
    // ISO week 1 starts in December: cut at the year
    expect(weekLabel(2025, 0)).toBe('Jan 1 – Jan 5');
    expect(weekLabel(2026, 0)).toBe('Jan 1 – Jan 4');
    // ISO week 1 starts on 4 January: 1–3 January count in week 0 too
    expect(weekLabel(2021, 0)).toBe('Jan 1 – Jan 10');
    expect(weekLabel(2027, 0)).toBe('Jan 1 – Jan 10');
  });

  it('ends the last weeks on 31 December', () => {
    expect(weekLabel(2026, 52)).toBe('Dec 28 – Dec 31');
    expect(weekLabel(2025, 51)).toBe('Dec 22 – Dec 28');
    expect(weekLabel(2025, 52)).toBe('Dec 29 – Dec 31');
    expect(weekLabel(2021, 51)).toBe('Dec 27 – Dec 31');
  });

  it('finds the week of a moment', () => {
    expect(weekIndexAt(Date.parse('2025-01-08T20:00:00Z'), 2025)).toBe(1);
    expect(weekIndexAt(Date.parse('2024-12-01T20:00:00Z'), 2025)).toBe(-1);
    // The days of 2024 in 2025's week 0 belong to 2024's page
    expect(weekIndexAt(Date.parse('2024-12-31T20:00:00Z'), 2025)).toBe(-1);
  });

  it('places the months along the axis', () => {
    const months = monthStarts(2025);
    expect(months).toHaveLength(12);
    expect(months[0]?.label).toBe('Jan');
    expect(months[0]?.at).toBeCloseTo(2 / 371, 5);
  });

  it('writes days', () => {
    expect(shortDay(Date.parse('2025-01-04T00:00:00Z'))).toBe('Sat Jan 4');
    expect(
      dayRange(
        Date.parse('2025-01-04T00:00:00Z'),
        Date.parse('2025-02-14T00:00:00Z'),
        2025,
      ),
    ).toBe('Jan 4 – Feb 14');
  });

  it('counts 1–3 January to week 0 when ISO week 1 starts on the 4th (as the API)', () => {
    expect(weekIndexAt(Date.parse('2021-01-02T20:00:00Z'), 2021)).toBe(0);
    expect(weekIndexAt(Date.parse('2027-01-03T20:00:00Z'), 2027)).toBe(0);
    expect(weekIndexAt(Date.parse('2027-01-11T20:00:00Z'), 2027)).toBe(1);
    expect(weekIndexAt(Date.parse('2026-12-31T20:00:00Z'), 2027)).toBe(-1);
  });

  it('has a 53rd week in a long ISO year', () => {
    expect(weekIndexAt(Date.parse('2026-12-31T20:00:00Z'), 2026)).toBe(52);
    expect(weekLabel(2026, 52)).toBe('Dec 28 – Dec 31');
  });
});
