import { describe, expect, it, vi } from 'vitest';

import { createChangeBudget } from './budget';

describe('createChangeBudget', () => {
  it('refuses a user past their cap, and logs that once', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const budget = createChangeBudget({ perRun: 10, perUser: 2 });

    expect([budget.take('a'), budget.take('a'), budget.take('a')]).toEqual([
      true,
      true,
      false,
    ]);
    budget.take('a');
    expect(budget.take('b')).toBe(true);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toContain('[CAP]');
    error.mockRestore();
  });

  it('refuses everyone once the run cap is reached', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const budget = createChangeBudget({ perRun: 3, perUser: 2 });

    const taken = ['a', 'a', 'b', 'b', 'c'].map((user) => budget.take(user));

    expect(taken).toEqual([true, true, true, false, false]);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});
