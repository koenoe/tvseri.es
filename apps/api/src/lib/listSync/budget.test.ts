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

  // A refund is for a change that wasn't made: it must free the room again,
  // and never make more room than was claimed
  it('frees a refunded claim for the user and the run, and no more', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const budget = createChangeBudget({ perRun: 2, perUser: 1 });

    budget.refund('a');
    expect([budget.take('a'), budget.take('a')]).toEqual([true, false]);
    budget.refund('a');
    expect(budget.take('a')).toBe(true);
    expect([budget.take('b'), budget.take('c')]).toEqual([true, false]);
    error.mockRestore();
  });
});
