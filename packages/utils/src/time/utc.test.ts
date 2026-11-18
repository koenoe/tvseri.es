import { describe, expect, it } from 'vitest';

import {
  addDaysUtc,
  daysBetweenUtc,
  endOfDayUtc,
  startOfDayUtc,
  todayUtc,
} from './utc';

describe('todayUtc', () => {
  it('is the UTC day, not the local one', () => {
    expect(todayUtc(Date.parse('2026-11-11T23:30:00-05:00'))).toBe(
      '2026-11-12',
    );
  });
});

describe('addDaysUtc', () => {
  it('crosses months and goes back', () => {
    expect(addDaysUtc('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysUtc('2026-12-01', -3)).toBe('2026-11-28');
  });
});

describe('daysBetweenUtc', () => {
  it('counts calendar days from one UTC day to another', () => {
    expect(daysBetweenUtc('2026-11-11', '2026-11-11')).toBe(0);
    expect(daysBetweenUtc('2026-11-11', '2026-11-12')).toBe(1);
    expect(daysBetweenUtc('2026-11-11', '2026-12-02')).toBe(21);
    expect(daysBetweenUtc('2026-11-12', '2026-11-11')).toBe(-1);
  });
});

describe('the bounds of a day', () => {
  it('starts at midnight UTC and ends a millisecond before the next', () => {
    const start = startOfDayUtc(Date.parse('2026-11-11T15:00:00Z'));
    expect(start).toBe(Date.parse('2026-11-11T00:00:00Z'));
    expect(endOfDayUtc('2026-11-11')).toBe(start + 86_400_000 - 1);
  });
});
