import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ takeFromAllowance: vi.fn() }));

vi.mock('@/lib/db/cache', () => ({
  takeFromAllowance: mocks.takeFromAllowance,
}));
vi.mock('@/utils/logWarn', () => ({ logWarn: () => undefined }));

import { nextUtcMidnight, takeDailyAllowance } from './allowance';

afterEach(() => {
  vi.useRealTimers();
  mocks.takeFromAllowance.mockReset();
});

describe('takeDailyAllowance', () => {
  it("takes from the source's counter for the UTC day", async () => {
    vi.useFakeTimers({ now: Date.parse('2026-11-15T23:30:00-05:00') });
    mocks.takeFromAllowance.mockResolvedValue(false);

    expect(await takeDailyAllowance('omdb', 80)).toBe(false);
    expect(mocks.takeFromAllowance).toHaveBeenCalledWith(
      'omdb-calls:v1:2026-11-16',
      80,
      2 * 24 * 60 * 60,
    );
  });

  it('lets the call through when the counter cannot be read', async () => {
    mocks.takeFromAllowance.mockRejectedValue(new Error('throttled'));

    expect(await takeDailyAllowance('mdblist', 800)).toBe(true);
  });
});

describe('nextUtcMidnight', () => {
  it('is the start of the next UTC day', () => {
    expect(nextUtcMidnight(Date.parse('2026-11-15T00:00:00Z'))).toBe(
      Date.parse('2026-11-16T00:00:00Z'),
    );
    expect(nextUtcMidnight(Date.parse('2026-12-31T23:59:59.999Z'))).toBe(
      Date.parse('2027-01-01T00:00:00Z'),
    );
  });
});
