import { describe, expect, it } from 'vitest';

import { formatMoment } from './relativeTime';

const NOW = Date.UTC(2026, 10, 10, 22, 0); // Tue 10 Nov 2026, 22:00 UTC

describe('formatMoment', () => {
  it('says today with the time first for nav lines', () => {
    const at = Date.UTC(2026, 10, 10, 21, 14);
    expect(formatMoment(at, NOW, 'time-first', 'UTC')).toBe('21:14 today');
  });

  it('says Yesterday first for lists', () => {
    const at = Date.UTC(2026, 10, 9, 22, 40);
    expect(formatMoment(at, NOW, 'day-first', 'UTC')).toBe('Yesterday, 22:40');
  });

  it('names the day for older moments', () => {
    const at = Date.UTC(2026, 10, 8, 21, 5);
    expect(formatMoment(at, NOW, 'day-first', 'UTC')).toBe('Sun, 21:05');
  });

  it('writes September as "Sep", never "Sept"', () => {
    const now = Date.UTC(2026, 8, 20, 12, 0);
    const at = Date.UTC(2026, 8, 6, 21, 5);
    expect(formatMoment(at, now, 'day-first', 'UTC')).toBe('Sep 6, 21:05');
    expect(formatMoment(at, now, 'at', 'UTC')).toBe('Sep 6 at 21:05');
  });

  it('uses the viewer’s time zone for the day boundary', () => {
    // 23:30 UTC on the 9th is already the 10th in Amsterdam
    const at = Date.UTC(2026, 10, 9, 23, 30);
    expect(formatMoment(at, NOW, 'time-first', 'Europe/Amsterdam')).toBe(
      '00:30 today',
    );
  });

  it('reads "today at 21:14" for a status line', () => {
    const at = Date.UTC(2026, 10, 10, 21, 14);
    expect(formatMoment(at, NOW, 'at', 'UTC')).toBe('today at 21:14');
    const older = Date.UTC(2026, 10, 8, 21, 5);
    expect(formatMoment(older, NOW, 'at', 'UTC')).toBe('Sun at 21:05');
  });

  it('gives the day alone for a date line ("Last import Oct 2")', () => {
    const older = Date.UTC(2026, 9, 2, 9, 30);
    expect(formatMoment(older, NOW, 'day', 'UTC')).toBe('Oct 2');
  });
});
