import { describe, expect, it } from 'vitest';

import { formatWhen } from './when';

// Thu 12 Nov 2026, 15:00 UTC
const NOW = Date.UTC(2026, 10, 12, 15);

describe('formatWhen (the one ladder)', () => {
  it('today and yesterday are words, by UTC day', () => {
    expect(formatWhen(Date.UTC(2026, 10, 12, 0, 30), NOW)).toBe('Today');
    expect(formatWhen(Date.UTC(2026, 10, 11, 23, 59), NOW)).toBe('Yesterday');
    expect(formatWhen(Date.UTC(2026, 10, 12, 1), NOW, { capital: false })).toBe(
      'today',
    );
    expect(formatWhen(Date.UTC(2026, 10, 11, 1), NOW, { capital: false })).toBe(
      'yesterday',
    );
  });

  it('the weekday within the last week', () => {
    expect(formatWhen(Date.UTC(2026, 10, 10), NOW)).toBe('Tue');
    expect(formatWhen(Date.UTC(2026, 10, 6), NOW)).toBe('Fri');
  });

  it('a week or more ago: "Nov 5" this year, "Jan 8, 2025" before', () => {
    expect(formatWhen(Date.UTC(2026, 10, 5), NOW)).toBe('Nov 5');
    expect(formatWhen(Date.UTC(2026, 0, 8), NOW)).toBe('Jan 8');
    expect(formatWhen(Date.UTC(2025, 0, 8), NOW)).toBe('Jan 8, 2025');
  });

  it('a viewer-zone day is for lines that also show a time', () => {
    const at = new Date(2026, 10, 12, 0, 30);
    const now = new Date(2026, 10, 12, 20).getTime();
    expect(formatWhen(at, now, { zone: 'local' })).toBe('Today');
  });
});
