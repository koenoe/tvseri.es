import { describe, expect, it } from 'vitest';

import {
  addIsoWeeks,
  firstMondayOf,
  isoWeekOf,
  mondayOfIsoWeek,
  yearWeekIndex,
} from './isoWeek';

const utc = (iso: string) => Date.parse(`${iso}T12:00:00Z`);

describe('firstMondayOf', () => {
  it('is the Monday of ISO week 1, UTC midnight', () => {
    expect(new Date(firstMondayOf(2025)).toISOString()).toBe(
      '2024-12-30T00:00:00.000Z',
    );
    expect(new Date(firstMondayOf(2026)).toISOString()).toBe(
      '2025-12-29T00:00:00.000Z',
    );
    expect(new Date(firstMondayOf(2021)).toISOString()).toBe(
      '2021-01-04T00:00:00.000Z',
    );
  });
});

describe('yearWeekIndex', () => {
  it('is the ISO week number minus one', () => {
    expect(yearWeekIndex(utc('2026-11-12'), 2026)).toBe(45);
    expect(yearWeekIndex(utc('2026-01-05'), 2026)).toBe(1);
    expect(yearWeekIndex(utc('2025-12-29'), 2026)).toBe(0);
  });

  it('keeps old-year days in the first week and next-year days in the last', () => {
    expect(yearWeekIndex(utc('2025-12-20'), 2026)).toBe(0);
    expect(yearWeekIndex(utc('2021-01-02'), 2021)).toBe(0);
    expect(yearWeekIndex(utc('2027-01-12'), 2026)).toBe(52);
    expect(yearWeekIndex(utc('2027-01-01'), 2026)).toBe(52);
  });
});

describe('isoWeekOf', () => {
  it('names the ISO week (Monday to Sunday, UTC)', () => {
    expect(isoWeekOf('2026-11-09')).toBe('2026-W46');
    expect(isoWeekOf('2026-11-13')).toBe('2026-W46');
    expect(isoWeekOf('2026-11-15')).toBe('2026-W46');
    expect(isoWeekOf('2026-11-16')).toBe('2026-W47');
  });

  it('gives the turn of the year to the year of the week’s Thursday', () => {
    expect(isoWeekOf('2026-12-31')).toBe('2026-W53');
    expect(isoWeekOf('2027-01-03')).toBe('2026-W53');
    expect(isoWeekOf('2027-01-04')).toBe('2027-W01');
    expect(isoWeekOf('2025-12-29')).toBe('2026-W01');
  });
});

describe('mondayOfIsoWeek and addIsoWeeks', () => {
  it('finds the Monday a week starts on', () => {
    expect(mondayOfIsoWeek('2026-W46')).toBe('2026-11-09');
    expect(mondayOfIsoWeek('2026-W01')).toBe('2025-12-29');
  });

  it('steps across the turn of the year', () => {
    expect(addIsoWeeks('2026-W46', -1)).toBe('2026-W45');
    expect(addIsoWeeks('2026-W53', 1)).toBe('2027-W01');
    expect(addIsoWeeks('2027-W01', -1)).toBe('2026-W53');
  });
});
