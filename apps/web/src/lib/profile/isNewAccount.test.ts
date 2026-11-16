import { describe, expect, it } from 'vitest';

import { isNewAccount } from './isNewAccount';

const NOW = Date.UTC(2026, 10, 12);

describe('isNewAccount', () => {
  it('is for accounts under 30 days', () => {
    expect(isNewAccount('2026-10-20T00:00:00Z', NOW)).toBe(true);
    expect(isNewAccount('2026-10-01T00:00:00Z', NOW)).toBe(false);
    expect(isNewAccount('nope', NOW)).toBe(false);
  });

  it('is exclusive at exactly 30 days, as the Home check was', () => {
    const created = '2026-10-13T00:00:00Z';
    const thirtyDays = Date.parse(created) + 30 * 86_400_000;
    expect(isNewAccount(created, thirtyDays - 1)).toBe(true);
    expect(isNewAccount(created, thirtyDays)).toBe(false);
  });
});
