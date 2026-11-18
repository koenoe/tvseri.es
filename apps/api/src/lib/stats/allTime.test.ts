import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The years list (History's months, Jump to) is cached until the next mark
 * clears it. A read that started before a mark must not store what it read
 * after the mark cleared the cache: that would keep the old years for a day
 * (a whole month missing from History after marks).
 */

type Stored = Readonly<{ asOf: number; value: unknown }>;

const table = vi.hoisted(() => new Map<string, Stored>());
const gate = vi.hoisted(() => ({
  held: false,
  reached: false,
  release: () => {},
}));

vi.mock('@/lib/db/cache', () => ({
  getCacheItem: async (key: string) => table.get(key)?.value ?? undefined,
  getCacheItems: async () => new Map(),
  invalidateCacheItemsAsOf: async (
    keys: ReadonlyArray<string>,
    asOf: number,
  ) => {
    for (const key of keys) {
      table.set(key, { asOf, value: null });
    }
  },
  setCacheItemAsOf: async (key: string, value: unknown, asOf: number) => {
    const current = table.get(key);
    if (current && current.asOf >= asOf) {
      return false;
    }
    table.set(key, { asOf, value });
    return true;
  },
}));
vi.mock('@/lib/db/user', () => ({ findUser: async () => ({ country: 'GB' }) }));
vi.mock('@/lib/rollups', () => ({
  readAllRollups: async () => {
    if (gate.held) {
      await new Promise<void>((resolve) => {
        gate.release = resolve;
        gate.reached = true;
      });
    }
    return new Map([
      [
        1,
        [
          {
            episodeNumber: 1,
            runtime: 30,
            seasonNumber: 1,
            watchedAt: Date.UTC(2026, 9, 1),
          },
        ],
      ],
    ]);
  },
}));
vi.mock('./data', () => ({ getAllTimeWatchedItems: async () => [] }));
vi.mock('@/utils/logWarn', () => ({ logWarn: () => undefined }));

import { getAllTimeStats } from './allTime';
import { invalidateAllTimeStats } from './cache';
import { buildStatsCacheKey } from './keys';

const KEY = buildStatsCacheKey('u1', 0, 'all-time');

beforeEach(() => {
  table.clear();
  gate.held = false;
  gate.reached = false;
  vi.useRealTimers();
});

describe('the years list cache and a mark', () => {
  it('a read that started before the mark cleared it stores nothing', async () => {
    vi.useFakeTimers({ now: 1_000, toFake: ['Date'] });
    gate.held = true;
    const read = getAllTimeStats('u1', 'Europe/London');
    await vi.waitFor(() => expect(gate.reached).toBe(true));
    // the mark's stream clears the cache while the read is out
    vi.setSystemTime(2_000);
    await invalidateAllTimeStats(['u1']);
    vi.setSystemTime(3_000);
    gate.release();
    await read;
    expect(table.get(KEY)?.value ?? null).toBeNull();
  });

  it('a read that started after the mark is stored', async () => {
    vi.useFakeTimers({ now: 1_000, toFake: ['Date'] });
    await invalidateAllTimeStats(['u1']);
    vi.setSystemTime(2_000);
    await getAllTimeStats('u1', 'Europe/London');
    expect(table.get(KEY)?.value).not.toBeNull();
  });
});
