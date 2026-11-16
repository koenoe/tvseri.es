import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadFirstMarkYear } from './counts';

const getYears = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/stats/getYears', () => ({
  getYears: (...args: unknown[]) => getYears(...args),
}));

beforeEach(() => {
  getYears.mockReset();
});

describe('loadFirstMarkYear', () => {
  it('is the oldest year in /stats/years', async () => {
    getYears.mockResolvedValue({
      years: [{ year: 2024 }, { year: 2019 }, { year: 2022 }],
    });

    expect(await loadFirstMarkYear('u1')).toBe(2019);
    expect(getYears).toHaveBeenCalledWith('u1');
  });

  it('is null when the years are unavailable', async () => {
    getYears.mockResolvedValue({ unavailable: true });
    expect(await loadFirstMarkYear('u2')).toBeNull();
  });
});
