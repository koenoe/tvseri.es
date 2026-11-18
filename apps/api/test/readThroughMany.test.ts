import { describe, expect, it, vi } from 'vitest';

import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { readThroughMany } from '@/lib/db/cache/readThrough';

import { db } from './db';

const key = (id: number) => `many:${id}`;

const commandsSent = () => {
  const counts: Record<string, number> = {};
  for (const command of db.calls) {
    counts[command.constructor.name] =
      (counts[command.constructor.name] ?? 0) + 1;
  }
  return counts;
};

const read = (
  ids: ReadonlyArray<number>,
  load: (id: number) => Promise<unknown>,
  failures: 'reject' | 'tolerate' = 'reject',
  ttl: number | ((value: unknown) => number | false) = 3600,
) => readThroughMany(ids, { concurrency: 4, failures, key, load, ttl });

describe('readThroughMany', () => {
  it('reads every key in one batch and loads only the misses, stored in one batch', async () => {
    await setCacheItem(key(1), { n: 1 });
    await setCacheItem(key(2), null);
    db.calls.length = 0;
    const load = vi.fn(async (id: number) => ({ n: id }));

    const answer = await read([3, 1, 2, 4, 3], load);

    expect([...answer]).toEqual([
      [3, { n: 3 }],
      [1, { n: 1 }],
      [2, null],
      [4, { n: 4 }],
    ]);
    expect(load.mock.calls.map(([id]) => id)).toEqual([3, 4]);
    expect(commandsSent()).toEqual({
      BatchGetItemCommand: 1,
      BatchWriteItemCommand: 1,
    });
    expect(await getCacheItem(key(4))).toEqual({ n: 4 });
  });

  it('stores each value for its own TTL, and not at all on false', async () => {
    await read(
      [1, 2, 3],
      async (id) => id,
      'reject',
      (value) => (value === 3 ? false : Number(value) * 60),
    );
    const expiresIn = (id: number) =>
      Number(
        db.dump('Cache').find((item) => item.pk === `CACHE#${key(id)}`)
          ?.expiresAt,
      ) - Math.floor(Date.now() / 1000);

    expect(expiresIn(1)).toBeCloseTo(60, -1);
    expect(expiresIn(2)).toBeCloseTo(120, -1);
    expect(await getCacheItem(key(3))).toBeUndefined();
  });

  it('serves an expired value when its load fails, without storing it again', async () => {
    await setCacheItem(key(1), { n: 1 }, { ttl: -60 });
    const answer = await read([1, 2], async (id) => {
      if (id === 1) {
        throw new Error('TMDB down');
      }
      return { n: id };
    });

    expect([...answer]).toEqual([
      [1, { n: 1 }],
      [2, { n: 2 }],
    ]);
    expect(await getCacheItem(key(1))).toBeUndefined();
  });

  it("'reject' fails the read and stores nothing when a load fails", async () => {
    await expect(
      read([1, 2], async (id) => {
        if (id === 2) {
          throw new Error('TMDB down');
        }
        return id;
      }),
    ).rejects.toThrow('TMDB down');
    expect(await getCacheItem(key(1))).toBeUndefined();
  });

  it("'tolerate' leaves an odd failure out, but fails above 10%", async () => {
    const ids = Array.from({ length: 20 }, (_, index) => index + 1);
    const failing = (bad: ReadonlySet<number>) => async (id: number) => {
      if (bad.has(id)) {
        throw new Error('TMDB down');
      }
      return id;
    };

    const answer = await read(ids, failing(new Set([5])), 'tolerate');
    expect(answer.has(5)).toBe(false);
    expect(answer.size).toBe(19);

    db.reset();
    await expect(
      read(ids, failing(new Set([1, 2, 3])), 'tolerate'),
    ).rejects.toThrow();
  });

  it('treats a failing cache read as all misses', async () => {
    await setCacheItem(key(1), 'cached');
    const send = db.send.bind(db);
    const spy = vi.spyOn(db, 'send').mockImplementation(async (command) => {
      if (command.constructor.name === 'BatchGetItemCommand') {
        throw new Error('throttled');
      }
      return send(command);
    });

    const answer = await read([1], async () => 'loaded');

    expect(answer.get(1)).toBe('loaded');
    spy.mockRestore();
  });
});
