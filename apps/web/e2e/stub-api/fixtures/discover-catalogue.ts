import type { StubRoute } from '../types';
import { hasKeyword } from './discover/keywords';
import { byId, networkId, SHOWS } from './discover/shows';

/**
 * `GET /discover` over the catalogue, plus the reference lists the hub and
 * landings use: `/discover/countries`, `/discover/languages`, and
 * `/series/:id`.
 */

const PAGE_SIZE = 20;

type Entry = (typeof SHOWS)[number];

const list = (value: string) =>
  value.includes('|')
    ? { all: false, values: value.split('|') }
    : { all: true, values: value.split(',') };

const matchesList = (value: string | null, test: (item: string) => boolean) => {
  if (!value) {
    return true;
  }
  const { all, values } = list(value);
  return all ? values.every(test) : values.some(test);
};

const ended = (entry: Entry) =>
  entry.series.status === 'Ended' || entry.series.status === 'Canceled';

const SORTS: Readonly<Record<string, (a: Entry, b: Entry) => number>> = {
  'first_air_date.asc': (a, b) =>
    a.series.firstAirDate.localeCompare(b.series.firstAirDate),
  'first_air_date.desc': (a, b) =>
    b.series.firstAirDate.localeCompare(a.series.firstAirDate),
  'popularity.desc': (a, b) => b.series.popularity - a.series.popularity,
  'vote_average.desc': (a, b) =>
    b.series.voteAverage - a.series.voteAverage ||
    b.series.voteCount - a.series.voteCount,
  'vote_count.desc': (a, b) => b.series.voteCount - a.series.voteCount,
};

/** The catalogue entries a discover query keeps, unsorted */
export const matching = (query: URLSearchParams): ReadonlyArray<Entry> => {
  const number = (key: string) =>
    query.has(key) ? Number(query.get(key)) : undefined;
  const from = query.get('first_air_date.gte');
  const to = query.get('first_air_date.lte');
  const votesFrom = number('vote_count.gte');
  const votesTo = number('vote_count.lte');
  const ratingFrom = number('vote_average.gte');
  const status = query.get('with_status');

  return SHOWS.filter((entry) => {
    const { series, show } = entry;
    return (
      matchesList(query.get('with_genres'), (genre) =>
        show.genres.includes(Number(genre)),
      ) &&
      !(query.get('without_genres') ?? '')
        .split(/[,|]/)
        .filter(Boolean)
        .some((genre) => show.genres.includes(Number(genre))) &&
      matchesList(query.get('with_keywords'), (keyword) =>
        hasKeyword(show.key, Number(keyword)),
      ) &&
      !(query.get('without_keywords') ?? '')
        .split(/[,|]/)
        .filter(Boolean)
        .some((keyword) => hasKeyword(show.key, Number(keyword))) &&
      matchesList(
        query.get('with_networks'),
        (network) => networkId(show.network) === Number(network),
      ) &&
      matchesList(
        query.get('with_origin_country'),
        (country) => show.country === country,
      ) &&
      matchesList(
        query.get('with_original_language'),
        (language) => show.language === language,
      ) &&
      (!from || series.firstAirDate >= from) &&
      (!to || series.firstAirDate <= to) &&
      (votesFrom === undefined || series.voteCount >= votesFrom) &&
      (votesTo === undefined || series.voteCount <= votesTo) &&
      (ratingFrom === undefined || series.voteAverage >= ratingFrom) &&
      (!status ||
        matchesList(status, (code) =>
          code === '0' ? !ended(entry) : code === '3' ? ended(entry) : false,
        ))
    );
  });
};

export const discover = (query: URLSearchParams) => {
  const items = [...matching(query)].sort(
    SORTS[query.get('sort_by') ?? ''] ?? SORTS['popularity.desc'],
  );

  const page = Number(query.get('page') ?? 1);
  return {
    items: items
      .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      .map((entry) => entry.series),
    queryString: '',
    totalNumberOfItems: items.length,
    totalNumberOfPages: Math.max(1, Math.ceil(items.length / PAGE_SIZE)),
  };
};

const COUNTRIES = [
  ['CA', 'Canada'],
  ['DE', 'Germany'],
  ['DK', 'Denmark'],
  ['ES', 'Spain'],
  ['FR', 'France'],
  ['GB', 'United Kingdom'],
  ['IE', 'Ireland'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['NL', 'Netherlands'],
  ['SE', 'Sweden'],
  ['US', 'United States of America'],
] as const;

const LANGUAGES = [
  ['da', 'Danish', 'Dansk'],
  ['de', 'German', 'Deutsch'],
  ['en', 'English', 'English'],
  ['es', 'Spanish', 'Español'],
  ['fr', 'French', 'Français'],
  ['ja', 'Japanese', '日本語'],
  ['ko', 'Korean', '한국어/조선말'],
  ['nl', 'Dutch', 'Nederlands'],
  ['sv', 'Swedish', 'svenska'],
] as const;

export const routes: ReadonlyArray<StubRoute> = [
  { handle: ({ query }) => ({ body: discover(query) }), path: '/discover' },
  {
    handle: () => ({
      body: COUNTRIES.map(([code, name]) => ({
        code,
        englishName: name,
        name,
      })),
    }),
    path: '/discover/countries',
  },
  {
    handle: () => ({
      body: LANGUAGES.map(([code, englishName, name]) => ({
        code,
        englishName,
        name,
      })),
    }),
    path: '/discover/languages',
  },
  // Catalogue shows only; other ids fall through to other streams' fixtures.
  {
    handle: ({ params }) => {
      const entry = byId(Number(params.id));
      return entry ? { body: entry.series } : undefined;
    },
    path: '/series/:id',
  },
];
