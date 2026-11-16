import {
  DURATION_BUCKETS,
  type DurationBucket,
  type DurationShow,
  type DurationTiles,
  type FinishThisWeekend,
  type GoDeeper,
  type Network,
  type TvSeries,
} from '@tvseri.es/schemas';

import type { StubRoute } from '../types';
import { byKey, imageUrl, networkId, SHOWS } from './discover/shows';

/**
 * The Discover hub's routes: today's Essentials and Go
 * deeper, the Duration tiles and their rows, Finish it this weekend, the
 * Essentials network, and the hand-picked tile shows under their real TMDB
 * ids. Shows and numbers are fixed so the page is stable.
 */

const entry = (key: string) => {
  const found = SHOWS.find((item) => item.show.key === key);
  if (!found) {
    throw new Error(`stub catalogue has no show "${key}"`);
  }
  return found;
};

const durationShow = (key: string, minutes?: number): DurationShow => {
  const { series, show } = entry(key);
  return {
    backdropImage: series.backdropImage ?? '',
    id: series.id,
    network: { id: networkId(show.network), name: show.network },
    numberOfEpisodes: show.episodes,
    numberOfSeasons: show.seasons,
    posterImage: series.posterImage ?? '',
    slug: series.slug,
    title: show.title,
    totalMinutes: minutes ?? show.episodes * show.runtime,
    year: show.year,
  };
};

const DURATION: Readonly<
  Record<
    DurationBucket,
    Readonly<{ count: number; exact: boolean; keys: ReadonlyArray<string> }>
  >
> = {
  'complete-stories': {
    count: 9870,
    exact: true,
    keys: [
      'twelvemonkeys',
      'travelers',
      'wire',
      'dark',
      'monster',
      'succession',
      'narcos',
      'barry',
    ],
  },
  'long-haul': {
    count: 1630,
    exact: false,
    keys: [
      'peaky',
      'sopranos',
      'wire',
      'office',
      'rookie',
      'doctorwho',
      'outlander',
      'b99',
    ],
  },
  'one-season': {
    count: 3980,
    exact: false,
    keys: ['deptq', 'blackrabbit', 'task', 'pluribus', 'studio', 'thousand'],
  },
  'one-weekend': {
    count: 2410,
    exact: false,
    keys: ['eleven', 'nightmanager', 'devs', 'penguin', 'fleabag', 'eric'],
  },
  'under-6-hours': {
    count: 1104,
    exact: true,
    keys: [
      'chernobyl',
      'adolescence',
      'babyreindeer',
      'eric',
      'devs',
      'blackrabbit',
      'task',
    ],
  },
};

const ESSENTIALS = [
  'severance',
  'slowhorses',
  'silo',
  'pluribus',
  'shrinking',
  'formankind',
  'morningshow',
  'studio',
  'badsisters',
];

const card = (
  kind: GoDeeper['cards'][number]['kind'],
  [from, rank]: readonly [string, number],
  why: string,
  to: Readonly<{ id: number; name: string; slug: string }>,
  total: number,
  keys: ReadonlyArray<string>,
): GoDeeper['cards'][number] => ({
  from: { id: entry(from).series.id, rank, title: entry(from).show.title },
  items: keys.map(byKey),
  kind,
  to,
  total,
  why,
});

/** Shows the hub names by their real TMDB id (Go deeper, the hand-picked tile shows), so a show link opens locally */
const REAL_IDS: Readonly<Record<number, string>> = {
  1398: 'sopranos',
  1438: 'wire',
  19885: 'sherlock',
  37854: 'onepiece',
  42009: 'blackmirror',
  43982: 'lineofduty',
  45016: 'bridge',
  60574: 'peaky',
  60948: 'twelvemonkeys',
  61859: 'nightmanager',
  63351: 'narcos',
  64464: 'eleven',
  67070: 'fleabag',
  67683: 'travelers',
  70523: 'dark',
  71446: 'moneyheist',
  83062: 'mocro',
  87108: 'chernobyl',
  115004: 'mare',
  225171: 'pluribus',
};

const APPLE_TV: Network = {
  description: null,
  homepage: 'https://example.com/apple-tv',
  id: 2552,
  logo: imageUrl('logo', 'Apple TV'),
  name: 'Apple TV',
  originCountry: { code: 'US', name: 'United States of America' },
  slug: 'apple-tv',
};

export const routes: ReadonlyArray<StubRoute> = [
  {
    handle: ({ query }) => {
      const body: GoDeeper = {
        cards: [
          card(
            'theme',
            ['pluribus', 1],
            'Also tagged dystopia, like Pluribus.',
            { id: 4565, name: 'Dystopia', slug: 'dystopia' },
            146,
            ['blackmirror', 'devs', 'twelvemonkeys'],
          ),
          card(
            'theme',
            ['deptq', 4],
            'Also tagged detective, like Dept. Q.',
            { id: 703, name: 'Detectives', slug: 'detectives' },
            1940,
            ['lineofduty', 'lifeonmars', 'monster'],
          ),
          card(
            'creator',
            ['adolescence', 6],
            'More from Stephen Graham, who created it.',
            { id: 1115, name: 'Stephen Graham', slug: 'stephen-graham' },
            31,
            ['thousand', 'peaky', 'mobland'],
          ),
        ],
        date: query.get('date') ?? '2026-11-10',
        essentials: {
          items: ESSENTIALS.map(byKey),
          network: { id: 2552, name: 'Apple TV', slug: 'apple-tv' },
          total: 244,
        },
      };
      return { body };
    },
    path: '/discover/go-deeper',
  },
  {
    handle: () => {
      const body: DurationTiles = {
        tiles: DURATION_BUCKETS.map((bucket) => ({
          bucket,
          count: DURATION[bucket].count,
          exact: DURATION[bucket].exact,
          listed: DURATION[bucket].keys.length,
          preview: DURATION[bucket].keys
            .slice(0, 3)
            .map((key) => durationShow(key)),
        })),
      };
      return { body };
    },
    path: '/duration',
  },
  {
    handle: () => {
      // Devs is in a Go deeper card above and Chernobyl is the Under 6 hours
      // tile's backdrop: the hub leaves both out (never repeat), and
      // four are left, as the API's eight leave on a real day
      const body: FinishThisWeekend = {
        items: [
          durationShow('chernobyl', 331),
          durationShow('devs', 345),
          durationShow('babyreindeer', 242),
          durationShow('fleabag', 316),
          durationShow('eric', 320),
          durationShow('adolescence', 240),
        ],
      };
      return { body };
    },
    path: '/duration/weekend',
  },
  {
    handle: ({ params, query }) => {
      const bucket = DURATION[params.bucket as DurationBucket];
      if (!bucket) {
        return undefined;
      }
      const page = Number(query.get('page') ?? 1);
      return {
        body: {
          bucket: params.bucket as DurationBucket,
          items: page === 1 ? bucket.keys.map((key) => durationShow(key)) : [],
          nextPage: null,
          page,
        },
      };
    },
    path: '/duration/:bucket',
  },
  {
    handle: ({ params }) =>
      Number(params.id) === APPLE_TV.id ? { body: APPLE_TV } : undefined,
    path: '/network/:id',
  },
  {
    handle: ({ params }) => {
      const key = REAL_IDS[Number(params.id)];
      if (!key) {
        return undefined;
      }
      const body: TvSeries = { ...entry(key).series, id: Number(params.id) };
      return { body };
    },
    path: '/series/:id',
  },
];
