import { describe, expect, it } from 'vitest';

import { SHORT_WEEKDAYS, WEEKDAY_NAMES } from './months';

describe('weekday names', () => {
  it('are indexed like Date.getDay(), Sunday first', () => {
    const sunday = new Date(Date.UTC(2026, 10, 15));
    expect(WEEKDAY_NAMES[sunday.getUTCDay()]).toBe('Sunday');
    expect(SHORT_WEEKDAYS[sunday.getUTCDay()]).toBe('Sun');
    expect(WEEKDAY_NAMES.map((day) => day.slice(0, 3))).toEqual([
      ...SHORT_WEEKDAYS,
    ]);
  });
});
