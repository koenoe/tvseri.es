import { NETWORKS } from '@tvseri.es/constants';
import type {
  LandingSwitchOption,
  Network,
  NetworkLandingFacts,
} from '@tvseri.es/schemas';

import type { StubRoute } from '../types';
import { byKey, imageUrl, networkId, SHOWS } from './discover/shows';

/**
 * The network landing: `GET /discover/landing/network/:slug/facts`
 * and `GET /network/:id`. HBO, Apple TV and Netflix carry fixed numbers
 * (381, 244 and 2,939 shows; "about 340 of its 381"); every other network
 * gets facts counted from the stub catalogue.
 */

const ERAS = [
  {
    filter: { 'first_air_date.lte': '2009-12-31' },
    key: 'before-2010',
    label: 'Before 2010',
  },
  {
    filter: {
      'first_air_date.gte': '2010-01-01',
      'first_air_date.lte': '2019-12-31',
    },
    key: '2010s',
    label: '2010s',
  },
  {
    filter: { 'first_air_date.gte': '2020-01-01' },
    key: '2020s',
    label: '2020s',
  },
] as const;

const era = (key: (typeof ERAS)[number]['key'], count: number) => {
  const found = ERAS.find((item) => item.key === key) ?? ERAS[0];
  return { ...found, count };
};

const genre = (
  key: string,
  label: string,
  id: number,
  count: number,
): LandingSwitchOption => ({
  count,
  filter: { with_genres: String(id) },
  key,
  label,
});

/** The landing's three states */
const SAMPLE_FACTS: Readonly<Record<string, NetworkLandingFacts>> = {
  'apple-tv': {
    bestBy: {
      kind: 'genres',
      options: [
        genre('drama', 'Drama', 18, 160),
        genre('comedy', 'Comedy', 35, 70),
        genre('sci-fi-fantasy', 'Sci-Fi & Fantasy', 10765, 38),
      ],
    },
    count: 244,
    originals: {
      exact: true,
      found: 244,
      items: [
        'severance',
        'slowhorses',
        'silo',
        'pluribus',
        'shrinking',
        'studio',
        'morningshow',
        'formankind',
        'badsisters',
      ].map(byKey),
      scanned: 244,
    },
    slug: 'apple-tv',
    type: 'network',
  },
  hbo: {
    bestBy: {
      kind: 'decades',
      options: [era('before-2010', 120), era('2010s', 150), era('2020s', 111)],
    },
    count: 381,
    originals: {
      exact: false,
      found: 107,
      items: [
        'sopranos',
        'wire',
        'sixfeet',
        'deadwood',
        'succession',
        'barry',
        'chernobyl',
        'mare',
        'whitelotus',
        'trueblood',
        'deuce',
        'treme',
        'enlightened',
        'task',
        'tlou',
        'truedetective',
        'penguin',
      ].map(byKey),
      scanned: 120,
    },
    slug: 'hbo',
    type: 'network',
  },
  netflix: {
    bestBy: {
      kind: 'decades',
      options: [era('2010s', 1210), era('2020s', 1590)],
    },
    count: 2939,
    originals: {
      exact: false,
      found: 52,
      items: [
        'eric',
        'deptq',
        'kingdom',
        'alice',
        'dp',
        'rain',
        'edgerunners',
        'blackrabbit',
        'squidgame',
        'dark',
        'glory',
        'adolescence',
        'babyreindeer',
      ].map(byKey),
      scanned: 120,
    },
    slug: 'netflix',
    type: 'network',
  },
};

/** Facts counted from the catalogue, for every other network */
const catalogueFacts = (slug: string, id: number): NetworkLandingFacts => {
  const shows = SHOWS.filter((entry) => networkId(entry.show.network) === id);
  const eras = ERAS.map((item) =>
    era(
      item.key,
      shows.filter((entry) => {
        const date = entry.series.firstAirDate;
        const filter: Readonly<Record<string, string>> = item.filter;
        const from = filter['first_air_date.gte'];
        const to = filter['first_air_date.lte'];
        return (!from || date >= from) && (!to || date <= to);
      }).length,
    ),
  ).filter((item) => item.count >= 2);
  return {
    bestBy:
      eras.length >= 2
        ? { kind: 'decades', options: eras }
        : { kind: 'genres', options: [] },
    count: shows.length,
    originals: {
      exact: true,
      found: shows.length,
      items: shows.map((entry) => entry.series),
      scanned: shows.length,
    },
    slug,
    type: 'network',
  };
};

/** Where each landing network comes from (TMDB's `origin_country`) */
const ORIGIN: Readonly<Record<string, readonly [string, string]>> = {
  GB: ['GB', 'United Kingdom'],
  JP: ['JP', 'Japan'],
  KR: ['KR', 'South Korea'],
  US: ['US', 'United States'],
};
const COUNTRY_BY_SLUG: Readonly<Record<string, string>> = {
  'bbc-four': 'GB',
  'bbc-one': 'GB',
  'bbc-three': 'GB',
  'bbc-two': 'GB',
  'channel-4': 'GB',
  crunchyroll: 'JP',
  'fuji-tv': 'JP',
  itv1: 'GB',
  jtbc: 'KR',
  kbs2: 'KR',
  mbc: 'KR',
  nhk: 'JP',
  'nippon-tv': 'JP',
  sbs: 'KR',
  'sky-atlantic': 'GB',
  'tokyo-mx': 'JP',
  'tv-asahi': 'JP',
  'tv-tokyo': 'JP',
  tvn: 'KR',
};

/** Networks whose stub logo is a filled block (drawn on a light chip) */
const FILLED_LOGOS: ReadonlySet<string> = new Set(['bbc-one']);

const network = (id: number): Network | undefined => {
  const entry = NETWORKS.find((item) => item.id === id);
  if (!entry) {
    return undefined;
  }
  const [code, name] = ORIGIN[COUNTRY_BY_SLUG[entry.slug] ?? 'US'] ?? [
    'US',
    'United States',
  ];
  const block = FILLED_LOGOS.has(entry.slug);
  return {
    description: entry.description,
    homepage: `https://www.example.com/${entry.slug}`,
    id: entry.id,
    logo: imageUrl(block ? 'logo-block' : 'logo', entry.name),
    ...(block && { logoSilhouette: false }),
    name: entry.name,
    originCountry: { code, name },
    slug: entry.slug,
  };
};

export const routes: ReadonlyArray<StubRoute> = [
  {
    handle: ({ params }) => {
      if (params.type !== 'network') {
        return undefined;
      }
      const slug = (params.slug ?? '').toLowerCase();
      const entry = NETWORKS.find((item) => item.slug === slug);
      if (!entry) {
        return { body: { message: 'Not Found' }, status: 404 };
      }
      return { body: SAMPLE_FACTS[slug] ?? catalogueFacts(slug, entry.id) };
    },
    path: '/discover/landing/:type/:slug/facts',
  },
  {
    handle: ({ params }) => {
      const body = network(Number(params.id));
      return body ? { body } : { body: { message: 'Not Found' }, status: 404 };
    },
    path: '/network/:id',
  },
];
