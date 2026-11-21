import type { LandingFilter } from '@tvseri.es/constants';
import type {
  LandingSwitchOption,
  NetworkLandingFacts,
  TvSeries,
} from '@tvseri.es/schemas';

import { getShow } from '@/lib/catalogue';
import { fetchDiscoverTvSeries } from '@/lib/tmdb/discover';
import { mapSettled } from '@/utils/limit';

import {
  byCountThenId,
  type Counter,
  genreShares,
  type Limited,
} from './shared';

/** An option of "The best of" needs this many shows */
const MIN_OPTION_SHOWS = 6;
const MAX_GENRE_OPTIONS = 6;
/** Originals are found among this many of the most popular shows (6 pages) */
const ORIGINALS_SCAN_PAGES = 6;
const ORIGINALS_ROW_SIZE = 20;

const ERAS: ReadonlyArray<
  Readonly<{ key: string; label: string; filter: LandingFilter }>
> = [
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
];

/** Decades when 2+ eras hold 6+ shows each, else genres */
const bestBy = async ({
  count,
  filter,
  total,
}: Readonly<{
  count: Counter;
  filter: LandingFilter;
  total: number;
}>): Promise<NetworkLandingFacts['bestBy']> => {
  const eras = (
    await Promise.all(
      ERAS.map(async (era) => ({
        count: await count({ ...filter, ...era.filter }),
        filter: era.filter,
        key: era.key,
        label: era.label,
      })),
    )
  ).filter((era) => era.count >= MIN_OPTION_SHOWS);

  if (eras.length >= 2) {
    return { kind: 'decades', options: eras };
  }

  const genres = await genreShares({ count, filter, total });
  const options: LandingSwitchOption[] = genres
    .filter((genre) => genre.count >= MIN_OPTION_SHOWS)
    .sort(byCountThenId)
    .slice(0, MAX_GENRE_OPTIONS)
    .map((genre) => ({
      count: genre.count,
      filter: { with_genres: String(genre.id) },
      key: genre.slug,
      label: genre.name,
    }));

  return { kind: 'genres', options };
};

/**
 * A show is an original when the first network in its list is this one. TMDB's
 * discover lists everything that aired there (licensed shows too), and the
 * network list needs a details call per show, so only the most popular shows
 * are scanned.
 */
const originals = async ({
  filter,
  limited,
  networkId,
  total,
}: Readonly<{
  filter: LandingFilter;
  limited: Limited;
  networkId: number;
  total: number;
}>): Promise<NetworkLandingFacts['originals']> => {
  const discover = (page: number) =>
    limited(() =>
      fetchDiscoverTvSeries({ ...filter, page, sort_by: 'popularity.desc' }),
    );

  const first = await discover(1);
  const lastPage = Math.min(
    first.totalNumberOfPages ?? 1,
    ORIGINALS_SCAN_PAGES,
  );
  const others = await Promise.all(
    Array.from({ length: Math.max(lastPage - 1, 0) }, (_, i) =>
      discover(i + 2),
    ),
  );
  const ids = [first, ...others].flatMap((page) => page.items.map((i) => i.id));

  const shows = await mapSettled(
    ids,
    (id) => limited(() => getShow(id)),
    ids.length,
  );
  const found = shows.filter(
    (show: TvSeries) => show.network?.id === networkId,
  );

  return {
    exact: ids.length >= total,
    found: found.length,
    items: found
      .filter((show) => show.posterImage)
      .slice(0, ORIGINALS_ROW_SIZE),
    scanned: ids.length,
  };
};

export const networkFacts = async ({
  count,
  filter,
  limited,
  slug,
}: Readonly<{
  count: Counter;
  filter: LandingFilter;
  limited: Limited;
  slug: string;
}>): Promise<NetworkLandingFacts> => {
  const total = await count(filter);
  const networkId = Number(filter.with_networks);

  if (total === 0) {
    return {
      bestBy: { kind: 'genres', options: [] },
      count: 0,
      originals: { exact: true, found: 0, items: [], scanned: 0 },
      slug,
      type: 'network',
    };
  }

  const [by, found] = await Promise.all([
    bestBy({ count, filter, total }),
    originals({ filter, limited, networkId, total }),
  ]);

  return { bestBy: by, count: total, originals: found, slug, type: 'network' };
};
