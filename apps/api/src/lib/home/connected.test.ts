import { describe, expect, it } from 'vitest';

import {
  type CastMember,
  type ConnectionSource,
  findPathsFrom,
  type KnownShow,
  MAX_LOOKUPS,
  MAX_PATHS,
} from './connected';

const member = (id: number, character = `Role of ${id}`): CastMember => ({
  character,
  id,
  image: `/${id}.jpg`,
  name: `Person ${id}`,
  slug: `person-${id}`,
});

/** A well-liked show by default: rated 8 by 1,000 voters */
const known = (
  id: number,
  { popularity = 10, voteAverage = 8, voteCount = 1000 } = {},
): KnownShow => ({ id, popularity, voteAverage, voteCount });

type World = Readonly<{
  casts: Record<number, ReadonlyArray<CastMember>>;
  shows: Record<number, ReadonlyArray<KnownShow>>;
  failing?: ReadonlyArray<number>;
}>;

/** A fake TMDB: casts per show, shows per person, counting every lookup */
const fake = ({ casts, failing = [], shows }: World, hasTime = () => true) => {
  const calls: string[] = [];
  const source: ConnectionSource = {
    castOf: async (id) => {
      calls.push(`cast:${id}`);
      if (failing.includes(id)) {
        throw new Error('boom');
      }
      return casts[id] ?? [];
    },
    hasTime,
    showsOf: async (id) => {
      calls.push(`shows:${id}`);
      if (failing.includes(id)) {
        throw new Error('boom');
      }
      return shows[id] ?? [];
    },
  };
  return { calls, source };
};

/**
 * Start 1 (lead 10); 10 was also in bridge 2 (with 20) and bridge 3 (with
 * 30); 20 went on to 100 and 101, 30 to 200
 */
const WORLD: World = {
  casts: {
    1: [member(10, 'Hal')],
    2: [member(20, 'Saul'), member(10, 'Walter')],
    3: [member(30, 'Kim'), member(10, 'Walt')],
    100: [member(20, 'Jimmy')],
    101: [member(20, 'Slippin Jimmy')],
    200: [member(30, 'Kimberly')],
  },
  shows: {
    10: [known(2, { popularity: 90 }), known(3, { popularity: 80 })],
    20: [known(2), known(100, { voteAverage: 8.5 }), known(101)],
    30: [known(3), known(200, { voteAverage: 8.2 })],
  },
};

const endsOf = (
  connections: Awaited<ReturnType<typeof findPathsFrom>>['connections'],
) => connections.map((connection) => connection.end.id);

describe('findPathsFrom', () => {
  it('finds two-step paths: the start, a lead in a show in between, someone from there in the end', async () => {
    const { source } = fake(WORLD);

    const { connections, partial } = await findPathsFrom(1, source);

    expect(partial).toBe(false);
    expect(connections[0]).toEqual({
      bridge: known(2, { popularity: 90 }),
      end: known(100, { voteAverage: 8.5 }),
      links: [
        { characters: ['Hal', 'Walter'], person: member(10, 'Hal') },
        { characters: ['Saul', 'Jimmy'], person: member(20, 'Saul') },
      ],
    });
  });

  it('spreads the paths over the shows in between, each end once', async () => {
    const { source } = fake(WORLD);

    const { connections } = await findPathsFrom(1, source);

    // bridge 2's best, bridge 3's best, then bridge 2's next
    expect(endsOf(connections)).toEqual([100, 200, 101]);
    expect(connections.map((c) => c.bridge.id)).toEqual([2, 3, 2]);
  });

  it('never links through a person who is in the start already', async () => {
    // 11 is in the start and in bridge 2: from bridge 2 only 20 may go on
    const { source } = fake({
      casts: {
        ...WORLD.casts,
        1: [member(10, 'Hal'), member(11, 'Lois')],
        2: [member(11, 'Lois again'), member(20, 'Saul'), member(10, 'W')],
      },
      shows: { ...WORLD.shows, 11: [known(2), known(300)] },
    });

    const { connections } = await findPathsFrom(1, source);

    for (const { links } of connections) {
      expect(links[1].person.id).not.toBe(11);
      expect(links[0].person.id).not.toBe(links[1].person.id);
    }
    expect(endsOf(connections)).not.toContain(300);
  });

  it('never ends at a show that shares a cast member with the start', async () => {
    const { source } = fake({
      ...WORLD,
      casts: {
        ...WORLD.casts,
        // the start's lead also leads 100: a one-step link in disguise
        100: [member(20, 'Jimmy'), member(10, 'Hal again')],
      },
    });

    const { connections } = await findPathsFrom(1, source);

    expect(endsOf(connections)).not.toContain(100);
    expect(endsOf(connections)).toEqual([200, 101]);
  });

  it('never ends at a show a lead of the start was in, without reading its cast', async () => {
    // four better-known shows of the lead's take the places in between
    const { calls, source } = fake({
      ...WORLD,
      shows: {
        ...WORLD.shows,
        10: [
          ...(WORLD.shows[10] ?? []),
          known(4, { popularity: 70 }),
          known(5, { popularity: 60 }),
          known(101, { popularity: 1 }),
        ],
      },
    });

    const { connections } = await findPathsFrom(1, source);

    expect(endsOf(connections)).not.toContain(101);
    expect(calls).not.toContain('cast:101');
  });

  it('leaves out the shows to avoid, the start, the shows in between and poorly rated or little-known ends', async () => {
    const { source } = fake({
      ...WORLD,
      shows: {
        ...WORLD.shows,
        20: [
          known(1),
          known(2),
          known(3),
          known(100),
          known(101, { voteAverage: 6.2 }),
          known(102, { voteCount: 40 }),
          known(103),
        ],
      },
    });

    const { connections } = await findPathsFrom(1, source, {
      avoid: new Set([103]),
    });

    expect(endsOf(connections)).toEqual([200, 100]);
  });

  it('ranks the ends by a rating that weighs its votes', async () => {
    const { source } = fake({
      ...WORLD,
      casts: { ...WORLD.casts, 102: [member(20, 'x')] },
      shows: {
        ...WORLD.shows,
        20: [
          known(100, { voteAverage: 9.4, voteCount: 210 }),
          known(101, { voteAverage: 8.8, voteCount: 20_000 }),
          known(102, { voteAverage: 7.4, voteCount: 900 }),
        ],
        30: [],
      },
    });

    const { connections } = await findPathsFrom(1, source);

    expect(endsOf(connections)).toEqual([101, 100, 102]);
  });

  it('keeps to its bounds however big the casts and filmographies are', async () => {
    const people = Array.from({ length: 40 }, (_, i) => member(1000 + i));
    const many = (base: number) =>
      Array.from({ length: 60 }, (_, i) => known(base + i));
    const casts: Record<number, ReadonlyArray<CastMember>> = { 1: people };
    const shows: Record<number, ReadonlyArray<KnownShow>> = {};
    for (const person of people) {
      shows[person.id] = many(5000 + (person.id % 7) * 100);
    }
    for (let id = 5000; id < 6000; id++) {
      casts[id] = [
        member(1000 + (id % 40)),
        ...Array.from({ length: 20 }, (_, i) => member(id * 10 + i)),
      ];
      for (let i = 0; i < 20; i++) {
        shows[id * 10 + i] = many(20_000 + i * 100);
      }
    }
    for (let id = 20_000; id < 23_000; id++) {
      casts[id] = [];
    }
    const { calls, source } = fake({ casts, shows });

    const { connections } = await findPathsFrom(1, source);

    expect(calls.length).toBeLessThanOrEqual(MAX_LOOKUPS);
    expect(MAX_LOOKUPS).toBeLessThanOrEqual(30);
    expect(connections.length).toBe(MAX_PATHS);
    expect(new Set(endsOf(connections)).size).toBe(MAX_PATHS);
  });

  it('answers with what it has, flagged partial, when a lookup fails', async () => {
    const { source } = fake({ ...WORLD, failing: [3] });

    const { connections, partial } = await findPathsFrom(1, source);

    expect(partial).toBe(true);
    expect(endsOf(connections)).toEqual([100, 101]);
  });

  it('starts no next round once out of time, and checks every end it returns', async () => {
    let rounds = 0;
    // time for the first three rounds only: the ends' casts are never read
    const { calls, source } = fake(WORLD, () => ++rounds <= 3);

    const { connections, partial } = await findPathsFrom(1, source);

    expect(partial).toBe(true);
    expect(connections).toEqual([]);
    expect(calls.some((call) => call === 'cast:100')).toBe(false);
  });

  it('finds nothing from a show without a cast', async () => {
    const { source } = fake({ casts: {}, shows: {} });

    expect(await findPathsFrom(1, source)).toEqual({
      connections: [],
      partial: false,
    });
  });
});
