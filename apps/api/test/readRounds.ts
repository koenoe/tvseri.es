import { vi } from 'vitest';

import { db } from './db';

/**
 * Runs `fn` and counts its DynamoDB round trips: the longest chain of
 * commands where each was sent only after an earlier one had answered.
 * Commands sent side by side share a round. Every answer is held back for
 * one macrotask, so commands sent together are all in flight before the
 * first one answers. A waterfall of reads that could run together shows up
 * as extra rounds.
 */
export const measureRounds = async <T>(
  fn: () => T | Promise<T>,
): Promise<Readonly<{ result: T; rounds: number }>> => {
  const send = db.send.bind(db);
  /** The deepest round that has answered so far */
  let answered = 0;
  let rounds = 0;
  const spy = vi
    .spyOn(db, 'send')
    .mockImplementation(async (command: Parameters<typeof db.send>[0]) => {
      const round = answered + 1;
      rounds = Math.max(rounds, round);
      try {
        return await send(command);
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 0));
        answered = Math.max(answered, round);
      }
    });
  try {
    const result = await fn();
    return { result, rounds };
  } finally {
    spy.mockRestore();
  }
};
