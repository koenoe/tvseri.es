import {
  DURATION_TILES_VERSION,
  genreName,
  landingFilter,
} from '@tvseri.es/constants';
import type {
  DurationBucket,
  DurationPage,
  DurationShow,
  DurationTiles,
  FinishThisWeekend,
  WhereToStart,
} from '@tvseri.es/schemas';
import { DURATION_BUCKETS } from '@tvseri.es/schemas';
import { countryInSentence, regionName, todayUtc } from '@tvseri.es/utils';
import { HTTPException } from 'hono/http-exception';
import {
  DAY_BUILD_TTL,
  readDayBuild,
  readThroughDay,
} from '@/lib/db/cache/readThroughDay';
import { hasTimeForAnother } from '@/lib/deadline';
import { getSeriesFactsReport } from '@/lib/seriesFacts';
import { fetchDiscoverTvSeries } from '@/lib/tmdb/discover';

import {
  BUCKETS,
  bucketQuery,
  type StartScope,
  toDurationShow,
  whyLine,
} from './buckets';
import { chooseStartBackups, chooseStartPicks, isSlotTop } from './startPicks';

const SAMPLE_PAGES = 2;
const PREVIEW = 3;
const WEEKEND_MAX_ITEMS = 8;
/** A tile's list: this many shows, read from at most this many discover pages */
export const LIST_TARGET = 20;
export const LIST_MAX_PAGES = 8;
/**
 * Next best shows per Where to start slot, for a page whose rows above show
 * a pick: Trending draws five, so five keep a slot filled
 */
const BACKUPS = 5;

/** An answer and whether a show TMDB failed on is missing from it */
export type Reported<T> = Readonly<{ partial: boolean; value: T }>;

/**
 * Cache table, 24 h: the computed lists are shared by everyone. Day builds
 * (readThroughDay): yesterday's stands in while today's is built or when it
 * can't be.
 */
const daily = async <T>(key: string, build: () => Promise<T>): Promise<T> =>
  (
    await readThroughDay({
      day: todayUtc(),
      key: (day) => `duration:v3:${key}:${day}`,
      load: build,
      ttl: () => DAY_BUILD_TTL,
    })
  ).value;

/**
 * Like `daily`, for answers that can miss a show TMDB failed on: a partial
 * one is kept an hour, so a complete one replaces it soon, and the route
 * keeps it out of the CDN; so is yesterday's when it stands in.
 */
const dailyReported = <T>(
  key: string,
  build: () => Promise<Reported<T>>,
): Promise<Reported<T>> =>
  readDayBuild({
    day: todayUtc(),
    key: (day) => `duration:v4:${key}:${day}`,
    load: build,
  });

/** Discover candidates and their facts, in discover order */
const candidatesOf = async (
  query: Parameters<typeof fetchDiscoverTvSeries>[0],
  pages: ReadonlyArray<number>,
) => {
  const results = await Promise.all(
    pages.map((page) => fetchDiscoverTvSeries({ ...query, page })),
  );
  const ids = [
    ...new Set(
      results.flatMap((result) => result.items.map((series) => series.id)),
    ),
  ];
  const { facts, failed } = await getSeriesFactsReport(ids);
  return {
    facts: ids.flatMap((id) => facts.get(id) ?? []),
    /** Shows TMDB failed to answer: absent from `facts` */
    failed: failed.size,
    totalPages: results[0]?.totalNumberOfPages ?? 0,
    totalResults: results[0]?.totalNumberOfItems ?? 0,
  };
};

/** Both images first, then a backdrop alone, then a poster alone, then none */
const artRank = (show: DurationShow) =>
  show.backdropImage ? (show.posterImage ? 0 : 1) : show.posterImage ? 2 : 3;

const hasArt = (show: DurationShow) => artRank(show) < 3;

/**
 * A tile's preview: its first three shows by art (each group in its own
 * order), once each, so a backdrop tile has a backdrop and a deck its
 * posters whenever any candidate has one.
 */
const previewOf = (
  candidates: ReadonlyArray<DurationShow>,
): ReadonlyArray<DurationShow> => {
  const seen = new Set<number>();
  return candidates
    .filter((show) => !seen.has(show.id) && Boolean(seen.add(show.id)))
    .map((show, index) => ({ index, show }))
    .sort((a, b) => artRank(a.show) - artRank(b.show) || a.index - b.index)
    .slice(0, PREVIEW)
    .map(({ show }) => show);
};

/**
 * The five tiles. "Under 6 hours" shows TMDB's miniseries count and "Complete
 * stories" its ended-show count: both exact. The other three are estimates:
 * the share of the 40 most popular shows (with 200+ votes) that fit, scaled
 * to the number of such shows on TMDB. The previews come from that same
 * sample, except "Under 6 hours": a miniseries is rarely among the most
 * popular shows, so its preview is the best rated of Finish it this weekend
 * (the miniseries' own candidates). A tile with fewer than three candidates
 * with art is topped up from its own first page, and the shows with art
 * come first, so no tile is left without an image while one of its shows
 * has one. The version (`DURATION_TILES_VERSION`) is in the
 * key and in the web's request: bump it when what is picked changes.
 */
export const fetchDurationTiles = (): Promise<Reported<DurationTiles>> =>
  dailyReported(`tiles:v${DURATION_TILES_VERSION}`, async () => {
    const [miniseries, ended, sample, weekend] = await Promise.all([
      fetchDiscoverTvSeries(BUCKETS['under-6-hours'].query),
      fetchDiscoverTvSeries(BUCKETS['complete-stories'].query),
      candidatesOf(
        { sort_by: 'popularity.desc', 'vote_count.gte': 200 },
        Array.from({ length: SAMPLE_PAGES }, (_, i) => i + 1),
      ),
      fetchFinishThisWeekend(),
    ]);

    // The sample's first page is that discover query: its total is the
    // number of such shows on TMDB
    const universe = sample.totalResults;

    let partial = sample.failed > 0 || weekend.partial;
    const tile = async (bucket: DurationBucket) => {
      const matching = sample.facts.filter(BUCKETS[bucket].includes);
      const own: ReadonlyArray<DurationShow> =
        bucket === 'under-6-hours'
          ? weekend.value.items
          : matching.map(toDurationShow);
      // the tile's own list: its size decides whether the hub offers it, and
      // it tops the preview up when the sample has too few shows with art
      const list = await fetchDurationList(bucket);
      partial ||= list.partial;
      const topUp = own.filter(hasArt).length < PREVIEW ? list.value : [];
      const exact =
        bucket === 'under-6-hours'
          ? miniseries.totalNumberOfItems
          : bucket === 'complete-stories'
            ? ended.totalNumberOfItems
            : undefined;
      return {
        bucket,
        count:
          exact ??
          Math.round(
            (matching.length / Math.max(sample.facts.length, 1)) * universe,
          ),
        exact: exact !== undefined,
        listed: list.value.length,
        preview: previewOf([...own, ...topUp]),
      };
    };

    const tiles = await Promise.all(DURATION_BUCKETS.map(tile));
    return { partial, value: { tiles } };
  });

/**
 * A tile's list, built once a day: its discover query's pages in order,
 * each show kept when its facts fit the tile, until `LIST_TARGET` shows or
 * `LIST_MAX_PAGES` pages (20 candidates and up to 20 facts lookups each;
 * facts are stored for a day and shared with every other route). The
 * queries are chosen so most candidates fit (`BUCKETS`): the hub shows all
 * five tiles only when every list fills. A build that runs short of time, or meets a
 * show TMDB fails on, stops between pages with what it has, kept an hour
 * (partial); a page with nothing new (the end of TMDB's list) ends it too.
 */
export const fetchDurationList = (
  bucket: DurationBucket,
): Promise<Reported<ReadonlyArray<DurationShow>>> =>
  dailyReported(`list:v2:${bucket}`, async () => {
    const { includes } = BUCKETS[bucket];
    const query = bucketQuery(bucket, todayUtc());
    const seen = new Set<number>();
    const items: DurationShow[] = [];
    let partial = false;
    for (let page = 1; page <= LIST_MAX_PAGES; page++) {
      if (page > 1 && !hasTimeForAnother()) {
        partial = true;
        break;
      }
      const candidates = await candidatesOf(query, [page]);
      let fresh = 0;
      for (const facts of candidates.facts) {
        if (!seen.has(facts.id)) {
          seen.add(facts.id);
          fresh += 1;
          if (includes(facts)) {
            items.push(toDurationShow(facts));
          }
        }
      }
      // TMDB failing on a show: stop here rather than press on, and keep
      // what fits for an hour
      if (candidates.failed > 0) {
        partial = true;
        break;
      }
      if (
        items.length >= LIST_TARGET ||
        page >= candidates.totalPages ||
        fresh === 0
      ) {
        break;
      }
    }
    return { partial, value: items.slice(0, LIST_TARGET) };
  });

/** A tile's shows: its day's list, one page (`page` 2 and on are empty) */
export const fetchDurationPage = async (
  bucket: DurationBucket,
  page: number,
): Promise<Reported<DurationPage>> => {
  const list = await fetchDurationList(bucket);
  return {
    partial: list.partial,
    value: {
      bucket,
      items: page === 1 ? list.value : [],
      nextPage: null,
      page,
    },
  };
};

/** Ended miniseries under 6 hours, best liked first */
export const fetchFinishThisWeekend = (): Promise<
  Reported<FinishThisWeekend>
> =>
  dailyReported('weekend', async () => {
    const { facts, failed } = await candidatesOf(
      BUCKETS['under-6-hours'].query,
      [1],
    );
    return {
      partial: failed > 0,
      value: {
        items: facts
          .filter(BUCKETS['under-6-hours'].includes)
          .sort((a, b) => b.voteAverage - a.voteAverage)
          .slice(0, WEEKEND_MAX_ITEMS)
          .map(toDurationShow),
      },
    };
  });

/** What Where to start picks from: a genre or theme landing (its slug) or a country */
export type WhereToStartFilter =
  | Readonly<{ genre: string }>
  | Readonly<{ theme: string }>
  | Readonly<{ country: string }>;

/** "series from the Netherlands" */
const countryName = (code: string) => countryInSentence(regionName(code));

/** Pool of candidates, Cache key and wording for each kind of filter */
const startSource = (filter: WhereToStartFilter) => {
  if ('genre' in filter) {
    return {
      key: `genre:${filter.genre}`,
      query: {
        ...landingFilter('genre', filter.genre),
        sort_by: 'vote_count.desc',
        'vote_count.gte': 500,
      },
      response: { genre: filter.genre },
    } as const;
  }
  if ('theme' in filter) {
    return {
      key: `theme:${filter.theme}`,
      // the theme's whole keyword set (and its genre, when it requires one)
      query: {
        ...landingFilter('theme', filter.theme),
        sort_by: 'vote_count.desc',
        'vote_count.gte': 500,
      },
      response: { theme: filter.theme },
    } as const;
  }
  return {
    key: `country:${filter.country}`,
    // Smaller countries have few shows with 500 votes
    query: {
      sort_by: 'vote_count.desc',
      'vote_count.gte': 100,
      with_origin_country: filter.country,
    },
    response: { country: filter.country },
  } as const;
};

/**
 * One pick for a night, a weekend and the long haul in a genre or a theme; for
 * a country the most-voted show replaces the night. `backups` are the next
 * best per slot, so a landing whose rows above show a pick can still fill
 * that slot. The response names the filter it answers.
 */
export const fetchWhereToStart = (
  filter: WhereToStartFilter,
): Promise<WhereToStart> => {
  const source = startSource(filter);
  return daily(`start:v5:${source.key}`, async () => {
    const pool = await candidatesOf(source.query, [1, 2]);
    // A pick says "the most-voted" or "the best rated": with a show missing
    // it could be wrong for a day. Fail (retryable, nothing cached) instead.
    if (pool.failed > 0) {
      throw new HTTPException(503, { message: 'Try again shortly' });
    }
    const genre = 'genre' in filter ? genreName(filter.genre) : undefined;

    const country = 'country' in filter;
    const scope: StartScope =
      'country' in filter
        ? { kind: 'country', name: countryName(filter.country) }
        : genre
          ? { kind: 'genre', name: genre }
          : { kind: 'theme' };
    const picks = chooseStartPicks(pool.facts, country);
    const backups = chooseStartBackups(pool.facts, country, picks, BACKUPS);
    const toPick =
      (first: boolean) =>
      ([kind, facts]: (typeof picks)[number]) => {
        const show = toDurationShow(facts);
        const top = first && isSlotTop(pool.facts, country, kind, facts.id);
        return { kind, show, why: whyLine(kind, show, scope, top) };
      };

    return {
      ...source.response,
      backups: backups.map(toPick(false)),
      picks: picks.map(toPick(true)),
    };
  });
};
