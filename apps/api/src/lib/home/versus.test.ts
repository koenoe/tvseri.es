import type { TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  areSimilar,
  buildVersusDeck,
  toVersusSide,
  VERSUS_DECK_SIZE,
  type VersusSource,
} from './versus';

const DRAMA = { id: 18, name: 'Drama', slug: 'drama' };
const MYSTERY = { id: 9648, name: 'Mystery', slug: 'mystery' };
const COMEDY = { id: 35, name: 'Comedy', slug: 'comedy' };
const TALK = { id: 10767, name: 'Talk', slug: 'talk' };

type Input = Readonly<{
  genres?: TvSeries['genres'];
  id: number;
  poster?: boolean;
  votes?: number;
}>;

/** A series as a TMDB list item (no seasons) */
const item = ({
  genres = [DRAMA],
  id,
  poster = true,
  votes = 2000,
}: Input): TvSeries =>
  ({
    firstAirDate: '2017-12-01T00:00:00.000Z',
    genres,
    id,
    lastAirDate: '2020-06-27T00:00:00.000Z',
    numberOfAiredEpisodes: 0,
    numberOfEpisodes: 0,
    numberOfSeasons: 0,
    posterImage: poster ? `https://image.tmdb.org/t/p/w342/p${id}.jpg` : '',
    slug: `show-${id}`,
    status: 'Ended',
    title: `Show ${id}`,
    voteAverage: 8.4,
    voteCount: votes,
  }) as TvSeries;

/** The same series with its details (aired seasons and episodes) */
const detailed = (input: Input): TvSeries => ({
  ...item(input),
  numberOfAiredEpisodes: 26,
  numberOfEpisodes: 26,
  numberOfSeasons: 3,
  seasons: [1, 2, 3].map((seasonNumber) => ({
    airDate: '2017-12-01T00:00:00.000Z',
    description: '',
    episodes: [],
    hasAired: true,
    id: seasonNumber,
    numberOfAiredEpisodes: seasonNumber === 3 ? 8 : 9,
    numberOfEpisodes: seasonNumber === 3 ? 8 : 9,
    seasonNumber,
    title: `Season ${seasonNumber}`,
  })),
});

/**
 * Seeds 1..n; seed k's first recommendation is 100 + k (a drama with close
 * votes), so every seed makes a pair unless a test says otherwise
 */
const source = (
  overrides: Partial<{
    seeds: ReadonlyArray<TvSeries>;
    similar: Record<number, ReadonlyArray<TvSeries>>;
    failDetails: ReadonlySet<number>;
    failSimilar: ReadonlySet<number>;
  }> = {},
) => {
  const calls = { details: 0, seeds: 0, similar: 0 };
  const seeds =
    overrides.seeds ??
    Array.from({ length: 20 }, (_, n) => item({ id: n + 1 }));
  const value: VersusSource = {
    details: async (id) => {
      calls.details += 1;
      if (overrides.failDetails?.has(id)) {
        throw new Error('HTTP error status: 500');
      }
      return detailed({ id });
    },
    seeds: async () => {
      calls.seeds += 1;
      return seeds;
    },
    similarTo: async (id) => {
      calls.similar += 1;
      if (overrides.failSimilar?.has(id)) {
        throw new Error('HTTP error status: 500');
      }
      return overrides.similar?.[id] ?? [item({ id: 100 + id })];
    },
  };
  return { calls, value };
};

const ids = (pairs: Awaited<ReturnType<typeof buildVersusDeck>>) =>
  pairs.map(({ left, right }) => [left.id, right.id]);

const noReport = () => {};

describe('areSimilar', () => {
  it('needs a shared genre', () => {
    expect(
      areSimilar(
        item({ genres: [DRAMA, MYSTERY], id: 1 }),
        item({ genres: [MYSTERY], id: 2 }),
      ),
    ).toBe(true);
    expect(
      areSimilar(
        item({ genres: [DRAMA], id: 1 }),
        item({ genres: [COMEDY], id: 2 }),
      ),
    ).toBe(false);
  });

  it('needs votes within three times of each other', () => {
    expect(
      areSimilar(item({ id: 1, votes: 3000 }), item({ id: 2, votes: 1000 })),
    ).toBe(true);
    expect(
      areSimilar(item({ id: 1, votes: 3001 }), item({ id: 2, votes: 1000 })),
    ).toBe(false);
  });

  it('never pairs a series with itself', () => {
    expect(areSimilar(item({ id: 1 }), item({ id: 1 }))).toBe(false);
  });
});

describe('toVersusSide', () => {
  it('keeps only what the card draws: the vote average to one decimal, aired seasons and episodes, years', () => {
    expect(
      toVersusSide({ ...detailed({ id: 7 }), voteAverage: 8.437 }),
    ).toEqual({
      episodes: 26,
      id: 7,
      posterImage: 'https://image.tmdb.org/t/p/w342/p7.jpg',
      seasons: 3,
      slug: 'show-7',
      title: 'Show 7',
      voteAverage: 8.4,
      years: '2017–2020',
    });
  });

  it('leaves out a series without a poster or without an aired episode', () => {
    expect(toVersusSide(detailed({ id: 7, poster: false }))).toBeUndefined();
    expect(
      toVersusSide({ ...detailed({ id: 7 }), numberOfAiredEpisodes: 0 }),
    ).toBeUndefined();
  });
});

describe('buildVersusDeck', () => {
  it('makes a full deck of similar pairs, each with both posters', async () => {
    const pairs = await buildVersusDeck('2026-11-15', source().value, noReport);

    expect(pairs).toHaveLength(VERSUS_DECK_SIZE);
    for (const { left, right } of pairs) {
      expect(right.id).toBe(left.id + 100);
      expect(left.posterImage).not.toBe('');
      expect(right.posterImage).not.toBe('');
    }
  });

  it('is the same deck for the same day, and a different one the next day', async () => {
    const day = await buildVersusDeck('2026-11-15', source().value, noReport);
    const again = await buildVersusDeck('2026-11-15', source().value, noReport);
    const next = await buildVersusDeck('2026-11-16', source().value, noReport);

    expect(ids(again)).toEqual(ids(day));
    expect(ids(next)[0]).not.toEqual(ids(day)[0]);
  });

  it('never puts a series in the deck twice', async () => {
    // every seed recommends seed 2 first, then its own partner
    const seeds = Array.from({ length: 20 }, (_, n) => item({ id: n + 1 }));
    const similar = Object.fromEntries(
      seeds.map((seed) => [
        seed.id,
        [item({ id: 2 }), item({ id: 100 + seed.id })],
      ]),
    );
    const pairs = await buildVersusDeck(
      '2026-11-15',
      source({ seeds, similar }).value,
      noReport,
    );

    const all = pairs.flatMap(({ left, right }) => [left.id, right.id]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('takes TMDB’s most similar recommendation that passes the rule', async () => {
    const seeds = [item({ id: 1 })];
    const similar = {
      1: [
        item({ genres: [COMEDY], id: 50 }), // no shared genre
        item({ id: 51, votes: 100 }), // not well known
        item({ id: 52, poster: false }), // no poster
        item({ genres: [DRAMA, TALK], id: 53 }), // a talk show
        item({ id: 54, votes: 9000 }), // votes too far apart
        item({ id: 55 }),
        item({ id: 56 }),
      ],
    };
    const pairs = await buildVersusDeck(
      '2026-11-15',
      source({ seeds, similar }).value,
      noReport,
    );

    expect(ids(pairs)).toEqual([[1, 55]]);
  });

  it('skips a seed that is not well known or has no partner', async () => {
    const seeds = [
      item({ genres: [TALK], id: 1 }),
      item({ id: 2, votes: 50 }),
      item({ id: 3 }),
    ];
    const similar = { 3: [item({ genres: [COMEDY], id: 103 })] };
    const pairs = await buildVersusDeck(
      '2026-11-15',
      source({ seeds, similar }).value,
      noReport,
    );

    expect(pairs).toEqual([]);
  });

  it('reports a failed lookup and goes on with the next seed', async () => {
    const failed: number[] = [];
    const seeds = [item({ id: 1 }), item({ id: 2 }), item({ id: 3 })];
    const pairs = await buildVersusDeck(
      '2026-11-15',
      source({
        failDetails: new Set([102]),
        failSimilar: new Set([1]),
        seeds,
      }).value,
      (count) => failed.push(count),
    );

    expect(ids(pairs)).toEqual([[3, 103]]);
    expect(failed.reduce((sum, count) => sum + count, 0)).toBe(2);
  });

  it('asks TMDB at most once for the seeds, once per seed tried and twice per pair', async () => {
    const { calls, value } = source();
    await buildVersusDeck('2026-11-15', value, noReport);

    expect(calls).toEqual({
      details: 2 * VERSUS_DECK_SIZE,
      seeds: 1,
      similar: VERSUS_DECK_SIZE,
    });
  });

  it('stops trying seeds when it runs out of time', async () => {
    const { calls, value } = source();
    const pairs = await buildVersusDeck(
      '2026-11-15',
      // asked before every seed after the first
      { ...value, hasTime: () => false },
      noReport,
    );

    expect(pairs).toHaveLength(1);
    expect(calls.similar).toBe(1);
  });
});
