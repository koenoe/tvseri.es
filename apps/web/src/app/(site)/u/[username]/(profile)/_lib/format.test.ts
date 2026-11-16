import { describe, expect, it } from 'vitest';

import { formatWatchTime, memberSince } from './format';

// Thu 12 Nov 2026, 15:00 UTC
const NOW = Date.UTC(2026, 10, 12, 15);

describe('memberSince', () => {
  it('says "today" on the UTC day of joining', () => {
    expect(memberSince('2026-11-12T00:00:00.000Z', NOW)).toBe('today');
    expect(memberSince('2026-11-12T14:59:00.000Z', NOW)).toBe('today');
  });

  it('names the month and year of joining (UTC) from the next day on', () => {
    expect(memberSince('2026-11-11T23:59:59.000Z', NOW)).toBe('Nov 2026');
    expect(memberSince('2024-11-03T10:15:00.000Z', NOW)).toBe('Nov 2024');
    expect(memberSince('2024-12-31T23:59:59.000Z', NOW)).toBe('Dec 2024');
  });
});

describe('durations', () => {
  it('time watched', () => {
    expect(formatWatchTime(230)).toBe('3h 50m');
    expect(formatWatchTime((5 * 24 + 1) * 60)).toBe('5d 1h');
    expect(formatWatchTime((22 * 24 + 9) * 60)).toBe('22d 9h');
    expect(formatWatchTime(3 * 24 * 60)).toBe('3d');
  });
});
