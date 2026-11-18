import { describe, expect, it } from 'vitest';

import { disableAll } from './disableAll';

type Config = { Enabled: boolean; Comment: string };

const fakeCloudFront = (
  configs: Record<string, Config>,
  failOn: ReadonlySet<string> = new Set(),
) => {
  const updated: Record<string, Record<string, unknown>> = {};
  return {
    deps: {
      getConfig: async (id: string) => {
        if (failOn.has(id)) throw new Error(`denied ${id}`);
        return {
          config: configs[id] ?? { Comment: '', Enabled: false },
          etag: `etag-${id}`,
        };
      },
      listDistributionIds: async () => Object.keys(configs),
      updateConfig: async (
        id: string,
        config: Record<string, unknown>,
        etag: string,
      ) => {
        expect(etag).toBe(`etag-${id}`);
        updated[id] = config;
      },
    },
    updated,
  };
};

describe('disableAll', () => {
  it('disables every enabled distribution and skips disabled ones', async () => {
    const cf = fakeCloudFront({
      A: { Comment: 'a', Enabled: true },
      B: { Comment: 'b', Enabled: false },
    });
    await disableAll(cf.deps);
    expect(cf.updated).toEqual({ A: { Comment: 'a', Enabled: false } });
  });

  it('still disables the others when one fails, then fails itself', async () => {
    const cf = fakeCloudFront(
      {
        A: { Comment: 'a', Enabled: true },
        B: { Comment: 'b', Enabled: true },
        C: { Comment: 'c', Enabled: true },
      },
      new Set(['B']),
    );
    await expect(disableAll(cf.deps)).rejects.toThrow(
      'Could not disable 1 of 3 distributions: B',
    );
    expect(Object.keys(cf.updated).sort()).toEqual(['A', 'C']);
  });

  it('fails when the distributions can’t be listed', async () => {
    const cf = fakeCloudFront({});
    await expect(
      disableAll({
        ...cf.deps,
        listDistributionIds: async () => {
          throw new Error('denied');
        },
      }),
    ).rejects.toThrow('denied');
  });
});
