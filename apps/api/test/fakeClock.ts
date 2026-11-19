import { vi } from 'vitest';

/**
 * Starts `work` on the fake clock, advances it `advanceMs` (running every
 * timer due, so work left in the background ends inside the test too) and
 * returns the value with the fake time it took to settle. A bound checked on
 * that time holds by the code's own deadlines, whatever the machine's load.
 * Needs `vi.useFakeTimers` with setTimeout, clearTimeout and Date faked.
 */
export const timeToSettle = async <T>(
  work: () => T | Promise<T>,
  advanceMs: number,
): Promise<Readonly<{ ms: number; value: T }>> => {
  const started = Date.now();
  let settledAt: number | undefined;
  const pending = Promise.resolve(work()).finally(() => {
    settledAt = Date.now();
  });
  pending.catch(() => undefined);
  await vi.advanceTimersByTimeAsync(advanceMs);
  if (settledAt === undefined) {
    throw new Error(`Still running after ${advanceMs} ms of fake time`);
  }
  return { ms: settledAt - started, value: await pending };
};
