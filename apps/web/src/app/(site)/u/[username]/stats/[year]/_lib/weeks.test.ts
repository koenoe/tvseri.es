import { describe, expect, it } from 'vitest';

import {
  dayRange,
  monthStarts,
  shortDay,
  weekIndexAt,
  weekLabel,
} from './weeks';

describe('weeks', () => {
  it('labels a week as the bars’ tooltips do', () => {
    expect(weekLabel(2025, 0)).toBe('Dec 30, 2024 – Jan 5');
    expect(weekLabel(2025, 1)).toBe('Jan 6 – Jan 12');
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
    expect(weekLabel(2026, 52)).toBe('Dec 28 – Jan 3, 2027');
  });
});
