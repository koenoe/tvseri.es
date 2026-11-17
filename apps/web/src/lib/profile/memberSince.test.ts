import { describe, expect, it } from 'vitest';

import { memberSince } from './memberSince';

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

  it('leaves the line out for a date it can’t read', () => {
    expect(memberSince('not a date', NOW)).toBeNull();
  });
});
