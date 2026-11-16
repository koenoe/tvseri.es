import type {
  SeriesFacts,
  SeriesFactsEpisode,
  TmdbTvSeries,
} from '@tvseri.es/schemas';
import slugify from 'slugify';

import { getCacheEntries, setCacheItems } from '@/lib/db/cache';
import { claim } from '@/lib/db/cache/singleFlight';
import { hasTimeForAnother, refreshWaitMs } from '@/lib/deadline';
import { fetchRawTvSeriesDetails, TMDB_CONCURRENCY } from '@/lib/tmdb';
import { atLowPriority } from '@/lib/upstream/budget';
import { createLimiter } from '@/utils/limit';
import { logWarn } from '@/utils/logWarn';
import { within } from '@/utils/within';

const HOUR_MS = 60 * 60 * 1000;

/** The shared routes' rule: facts older than a day are fetched again */
const TTL_SECONDS = 24 * 60 * 60;

/**
 * Facts stay in the Cache table this long (DynamoDB TTL): the personal
 * routes serve them up to this age, refreshing a few at a time.
 */
const HARD_LIFE_SECONDS = 7 * 24 * 60 * 60;

/**
 * A personal read refreshes facts past their soft life: a day plus up to 6
 * hours, fixed per show, so the shows a view stored together don't all go
 * stale in the same minute.
 */
const SOFT_JITTER_MS = 6 * HOUR_MS;
const softLifeOf = (id: number) =>
  TTL_SECONDS * 1000 + ((Math.imul(id, 2654435761) >>> 0) % SOFT_JITTER_MS);

/** Stale facts one personal read refreshes, oldest first */
const MAX_REFRESHES = 20;
/** Missing facts one personal read fetches; the rest come on later views */
const MAX_MISSING = 100;

const cacheKey = (id: number) => `series-facts:v1:${id}`;

/** Cached facts carry when they were read: DynamoDB TTL deletes lag hours */
type CachedFacts = SeriesFacts & Readonly<{ fetchedAt: number }>;

type TmdbEpisode = Readonly<{
  air_date?: string | null;
  episode_number: number;
  runtime?: number | null;
  season_number: number;
}>;

const toEpisode = (
  episode: TmdbEpisode | null | undefined,
): SeriesFactsEpisode | null =>
  episode?.air_date !== undefined && episode.season_number > 0
    ? {
        airDate: episode.air_date ?? '',
        episodeNumber: episode.episode_number,
        runtime: episode.runtime ?? null,
        seasonNumber: episode.season_number,
      }
    : null;

const average = (values: ReadonlyArray<number>) =>
  values.length > 0
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;

const toSeriesFacts = (series: TmdbTvSeries): SeriesFacts => {
  const seasons = (series.seasons ?? [])
    .filter((season) => season.season_number > 0 && season.episode_count > 0)
    .map((season) => ({
      airDate: season.air_date ?? '',
      episodeCount: season.episode_count,
      seasonNumber: season.season_number,
    }));
  const numberOfEpisodes = seasons.reduce(
    (sum, season) => sum + season.episodeCount,
    0,
  );
  const lastEpisodeToAir = toEpisode(
    series.last_episode_to_air as TmdbEpisode | null,
  );
  const episodeRuntime =
    average((series.episode_run_time ?? []).filter((runtime) => runtime > 0)) ??
    (lastEpisodeToAir?.runtime || null);

  return {
    backdropPath: series.backdrop_path ?? null,
    episodeRuntime,
    firstAirDate: series.first_air_date ?? '',
    genreIds: (series.genres ?? []).map((genre) => genre.id),
    id: series.id,
    imdbId: series.external_ids?.imdb_id || null,
    lastAirDate: series.last_air_date ?? '',
    lastEpisodeToAir,
    networks: (series.networks ?? []).map((network) => ({
      id: network.id,
      name: network.name ?? '',
    })),
    nextEpisodeToAir: toEpisode(
      series.next_episode_to_air as TmdbEpisode | null,
    ),
    numberOfEpisodes,
    originalLanguage: series.original_language ?? '',
    originCountries: series.origin_country ?? [],
    popularity: series.popularity ?? 0,
    posterPath: series.poster_path ?? null,
    seasons,
    slug: slugify(series.name ?? '', { lower: true, strict: true }),
    status: series.status ?? 'Ended',
    title: series.name ?? '',
    totalRuntime:
      episodeRuntime === null ? null : episodeRuntime * numberOfEpisodes,
    type: series.type ?? null,
    voteAverage: series.vote_average ?? 0,
    voteCount: series.vote_count ?? 0,
  };
};

/** Facts by id, and the ids TMDB failed to answer (a timeout, a 5xx...) */
type SeriesFactsReport = Readonly<{
  facts: ReadonlyMap<number, SeriesFacts>;
  failed: ReadonlySet<number>;
}>;

const withoutFetchedAt = ({ fetchedAt: _, ...rest }: CachedFacts) => rest;

const readCached = async (ids: ReadonlyArray<number>) =>
  getCacheEntries<CachedFacts>(ids.map(cacheKey)).catch((error: unknown) => {
    logWarn('Series facts cache get failed, continuing without cache', error);
    return new Map<string, Readonly<{ value: CachedFacts | null }>>();
  });

/** One TMDB details call; undefined for a show TMDB doesn't know */
const fetchFacts = async (id: number) => {
  const series = await fetchRawTvSeriesDetails(id);
  return series ? toSeriesFacts(series) : undefined;
};

const store = async (found: ReadonlyArray<SeriesFacts>, now: number) => {
  if (found.length === 0) {
    return;
  }
  await setCacheItems(
    found.map(
      (entry) =>
        [
          cacheKey(entry.id),
          { ...entry, fetchedAt: now } satisfies CachedFacts,
        ] as const,
    ),
    { ttl: HARD_LIFE_SECONDS },
  ).catch((error: unknown) =>
    logWarn('Series facts cache set failed, continuing without cache', error),
  );
};

/**
 * The facts of many shows, by id, for the shared CDN-cached routes
 * (duration, summaries). Facts are cached per show in the Cache table and
 * shared by every user; older than a day they are fetched again (one TMDB
 * details call each, bounded concurrency). Shows TMDB doesn't know are absent
 * from `facts`. A TMDB failure for one show leaves it out of `facts` and lists
 * it in `failed` (unless older facts are still stored: those are served),
 * instead of failing the rest: a caller whose answer is cached must not cache
 * it with a show missing.
 */
export const getSeriesFactsReport = async (
  ids: ReadonlyArray<number>,
): Promise<SeriesFactsReport> => {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) {
    return { facts: new Map(), failed: new Set() };
  }

  const now = Date.now();
  const cached = await readCached(uniqueIds);

  const facts = new Map<number, SeriesFacts>();
  const missing: number[] = [];
  for (const id of uniqueIds) {
    const hit = cached.get(cacheKey(id))?.value;
    if (hit && now - hit.fetchedAt < TTL_SECONDS * 1000) {
      facts.set(id, withoutFetchedAt(hit));
    } else {
      missing.push(id);
    }
  }

  const failed = new Set<number>();
  const limit = createLimiter(TMDB_CONCURRENCY);
  const fetched = await Promise.all(
    missing.map((id) =>
      limit(async () => {
        try {
          return await fetchFacts(id);
        } catch (error) {
          // Stale if error: older facts still stored beat a missing show;
          // they aren't stored again
          const stale = cached.get(cacheKey(id))?.value;
          if (stale) {
            logWarn(
              `Series facts fetch failed for ${id}, serving stale`,
              error,
            );
            facts.set(id, withoutFetchedAt(stale));
            return undefined;
          }
          logWarn(`Series facts fetch failed for ${id}`, error);
          failed.add(id);
          return undefined;
        }
      }),
    ),
  );

  const found = fetched.filter((entry) => entry !== undefined);
  for (const entry of found) {
    facts.set(entry.id, entry);
  }
  await store(found, now);

  return { facts, failed };
};

/** How long a refresh is left to the instance that claimed it */
const REFRESH_CLAIM_SECONDS = 60;

/**
 * The stale shows this read refreshes: those no other Lambda is refreshing
 * (single-flight: one conditional write per stale show, singleFlight.ts).
 * Without a claim the stored facts are served, as they are anyway while
 * stale. A failed claim (DynamoDB) refreshes anyway.
 */
const claimRefreshes = async (ids: ReadonlyArray<number>) => {
  const claimed = await Promise.all(
    ids.map((id) =>
      claim(`series-facts-refresh:v1:${id}`, REFRESH_CLAIM_SECONDS).catch(
        () => true,
      ),
    ),
  );
  return ids.filter((_, index) => claimed[index]);
};

/**
 * The facts of many shows for the personal routes (profile overview,
 * Library, Home rows, Waiting for, ledger, Circle, match): what they have,
 * a show without facts is simply absent. Bounded per read so one view never
 * becomes hundreds of TMDB calls:
 *
 * - facts stored less than 7 days ago are served; past their soft life (a
 *   day plus a per-show jitter of up to 6 hours) they are still served, and
 *   the 20 oldest are refreshed, waited for only what is left of the
 *   request's refresh wait (`refreshWaitMs`); a
 *   refresh that fails keeps the stored entry and its life;
 * - only missing facts block on TMDB: at most 100 a read;
 * - no fetch starts once the request is nearly out of time.
 */
export const getSeriesFacts = async (
  ids: ReadonlyArray<number>,
): Promise<ReadonlyMap<number, SeriesFacts>> => {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const now = Date.now();
  const cached = await readCached(uniqueIds);

  const facts = new Map<number, SeriesFacts>();
  const missing: number[] = [];
  const stale: CachedFacts[] = [];
  for (const id of uniqueIds) {
    const hit = cached.get(cacheKey(id))?.value;
    const age = hit ? now - hit.fetchedAt : Number.POSITIVE_INFINITY;
    if (!hit || age >= HARD_LIFE_SECONDS * 1000) {
      missing.push(id);
      continue;
    }
    facts.set(id, withoutFetchedAt(hit));
    if (age >= softLifeOf(id)) {
      stale.push(hit);
    }
  }
  const refresh = await claimRefreshes(
    stale
      .sort((a, b) => a.fetchedAt - b.fetchedAt)
      .slice(0, MAX_REFRESHES)
      .map((hit) => hit.id),
  );

  const fetchMany = (ids: ReadonlyArray<number>) => {
    const limit = createLimiter(TMDB_CONCURRENCY);
    return Promise.all(
      ids.map((id) =>
        limit(async () => {
          if (!hasTimeForAnother()) {
            return undefined;
          }
          try {
            return await fetchFacts(id);
          } catch (error) {
            // A missing show stays absent; a stale one keeps its entry
            logWarn(`Series facts fetch failed for ${id}`, error);
            return undefined;
          }
        }),
      ),
    ).then(async (fetched) => {
      const found = fetched.filter((entry) => entry !== undefined);
      await store(found, now);
      return found;
    });
  };

  // Only missing facts hold the answer. Refreshes of stale ones (served
  // already) get what is left of the request's refresh wait
  // (`refreshWaitMs`): what ends by then is used, the rest
  // stores when it ends. On Lambda that may be on a later invocation: the
  // environment is frozen once the handler returns and thawed on the next
  // one (docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html),
  // and Hono on Lambda has no waitUntil. A refresh that never ends is lost,
  // which costs nothing: its claim lapses and a later read refreshes.
  const refreshing = atLowPriority(() => fetchMany(refresh));
  refreshing.catch(() => undefined);
  const [found, refreshed] = await Promise.all([
    fetchMany(missing.slice(0, MAX_MISSING)),
    within(refreshing, refreshWaitMs()).catch(() => undefined),
  ]);
  for (const entry of [
    ...found,
    ...(refreshed && !refreshed.timedOut ? refreshed.value : []),
  ]) {
    facts.set(entry.id, entry);
  }

  return facts;
};

/**
 * The stored facts of some shows, however old within their 7-day life,
 * without asking TMDB: for a write that must not wait on it (placing a show
 * in the mark request; the stream places it again from TMDB seconds later).
 */
export const peekSeriesFacts = async (
  ids: ReadonlyArray<number>,
): Promise<ReadonlyMap<number, SeriesFacts>> => {
  const now = Date.now();
  const cached = await readCached([...new Set(ids)]);
  const facts = new Map<number, SeriesFacts>();
  for (const [, entry] of cached) {
    const hit = entry.value;
    if (hit && now - hit.fetchedAt < HARD_LIFE_SECONDS * 1000) {
      facts.set(hit.id, withoutFetchedAt(hit));
    }
  }
  return facts;
};
