import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { SeriesStates } from '@tvseri.es/schemas';
import { describe, expect, it, vi } from 'vitest';

import { NEW_TO_YOU } from '../controlState';
import { createSeriesStatesLoader } from './seriesStates';

/** React's `cache` within one request: one result per argument */
const requestScope = () => {
  return <A extends unknown[], R>(fn: (...args: A) => R) => {
    const results = new Map<string, R>();
    return (...args: A): R => {
      const key = JSON.stringify(args);
      if (!results.has(key)) {
        results.set(key, fn(...args));
      }
      return results.get(key) as R;
    };
  };
};

const answer = (ids: ReadonlyArray<number>): SeriesStates => ({
  states: Object.fromEntries(
    ids.map((id) => [String(id), { onWatchlist: false, state: 'finished' }]),
  ),
});

const setup = (
  overrides: Partial<{
    fetchStates: (
      token: string,
      ids: ReadonlyArray<number>,
    ) => Promise<SeriesStates>;
    token: string | null;
  }> = {},
) => {
  const fetchStates = vi.fn(
    overrides.fetchStates ?? (async (_token, ids) => answer(ids)),
  );
  const load = createSeriesStatesLoader({
    dedupe: requestScope(),
    fetchStates,
    viewerToken: async () =>
      overrides.token === undefined ? 'token-1' : overrides.token,
  });
  return { fetchStates, load };
};

describe('loadSeriesStates', () => {
  it('signed out: null, and nothing is read', async () => {
    const { fetchStates, load } = setup({ token: null });
    await expect(load([1, 2])).resolves.toBeNull();
    expect(fetchStates).not.toHaveBeenCalled();
  });

  it('sends the viewer’s token with the distinct ids, and maps every state', async () => {
    const { fetchStates, load } = setup();
    await expect(load([3, 1, 3])).resolves.toEqual({
      1: { kind: 'finished', onWatchlist: false },
      3: { kind: 'finished', onWatchlist: false },
    });
    expect(fetchStates).toHaveBeenCalledExactlyOnceWith('token-1', [1, 3]);
  });

  it('one call per request, whichever control asks first and in what order', async () => {
    const { fetchStates, load } = setup();
    const first = load([5, 4]);
    expect(load([4, 5, 5])).toBe(first);
    await first;
    expect(fetchStates).toHaveBeenCalledTimes(1);
  });

  it('a new request reads again (never shared between requests)', async () => {
    const fetchStates = vi.fn(
      async (_token: string, ids: ReadonlyArray<number>) => answer(ids),
    );
    for (const token of ['token-a', 'token-b']) {
      const load = createSeriesStatesLoader({
        dedupe: requestScope(),
        fetchStates,
        viewerToken: async () => token,
      });
      await load([1]);
    }
    expect(fetchStates.mock.calls.map(([token]) => token)).toEqual([
      'token-a',
      'token-b',
    ]);
  });

  it('is not a shared cache: the module has no `use cache`', () => {
    const source = readFileSync(
      path.join(import.meta.dirname, 'seriesStates.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/['"]use cache/);
  });

  it('asks in chunks of 60 ids', async () => {
    const { fetchStates, load } = setup();
    const ids = Array.from({ length: 130 }, (_, index) => index + 1);
    const states = await load(ids);
    expect(fetchStates.mock.calls.map(([, part]) => part.length)).toEqual([
      60, 60, 10,
    ]);
    expect(Object.keys(states ?? {})).toHaveLength(130);
  });

  it('a failed read: every id new to you (the pair), never a throw', async () => {
    const { load } = setup({
      fetchStates: async () => {
        throw new Error('ApiInvalidResponse');
      },
    });
    await expect(load([1, 2])).resolves.toEqual({
      1: NEW_TO_YOU,
      2: NEW_TO_YOU,
    });
  });

  it('a failed chunk leaves the others', async () => {
    const { load } = setup({
      fetchStates: async (_token, ids) => {
        if (ids[0] === 1) {
          throw new Error('500');
        }
        return answer(ids);
      },
    });
    const ids = Array.from({ length: 61 }, (_, index) => index + 1);
    const states = await load(ids);
    expect(states?.[1]).toEqual(NEW_TO_YOU);
    expect(states?.[61]).toEqual({ kind: 'finished', onWatchlist: false });
  });

  it('an id the answer leaves out is new to you', async () => {
    const { load } = setup({ fetchStates: async () => ({ states: {} }) });
    await expect(load([9])).resolves.toEqual({ 9: NEW_TO_YOU });
  });

  it('no ids: no call', async () => {
    const { fetchStates, load } = setup();
    await expect(load([])).resolves.toEqual({});
    expect(fetchStates).not.toHaveBeenCalled();
  });
});
