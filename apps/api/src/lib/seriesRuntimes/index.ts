import type { SeriesRuntimes } from '@tvseri.es/schemas';

import { getCacheEntries, setCacheItems } from '@/lib/db/cache';
import { loadMissingAndStale } from '@/lib/db/cache/loadMissingAndStale';
import { fetchTvSeriesRuntimes } from '@/lib/tmdb/seasons';
import { logWarn } from '@/utils/logWarn';

/**
 * A show's episode runtimes (every regular season, index = episode − 1, 0
 * where TMDB has none): the one source every "time left" sums, the show
 * page's (`GET /series/:id/runtimes`) and the overview's (Home's In
 * progress, the profile, the Library). Kept in the Cache table for 6 hours
 * and shared by every user, like the overview's season reads: a new
 * episode's runtime shows up within hours of TMDB having it.
 */
const TTL_SECONDS = 6 * 60 * 60;
/** A show TMDB doesn't know: asked again within the hour */
const UNKNOWN_TTL_SECONDS = 60 * 60;

const cacheKey = (id: number) => `series-runtimes:v1:${id}`;

type Entry = Readonly<{ expired: boolean; value: SeriesRuntimes | null }>;

/** Cache reads are best-effort: a failed read is a miss */
const readCache = (ids: ReadonlyArray<number>) =>
  getCacheEntries<SeriesRuntimes>(ids.map(cacheKey)).catch((error: unknown) => {
    logWarn('Series runtimes cache get failed, continuing without', error);
    return new Map<string, Entry>();
  });

const writeCache = (
  entries: ReadonlyArray<readonly [id: number, SeriesRuntimes | null]>,
) => {
  const known = entries.filter(([, runtimes]) => runtimes !== null);
  const unknown = entries.filter(([, runtimes]) => runtimes === null);
  return Promise.all([
    known.length > 0
      ? setCacheItems(
          known.map(([id, runtimes]) => [cacheKey(id), runtimes] as const),
          { ttl: TTL_SECONDS },
        )
      : undefined,
    unknown.length > 0
      ? setCacheItems(
          unknown.map(([id]) => [cacheKey(id), null] as const),
          { ttl: UNKNOWN_TTL_SECONDS },
        )
      : undefined,
  ]).catch((error: unknown) =>
    logWarn('Series runtimes cache set failed, continuing without', error),
  );
};

type Request = Readonly<{
  id: number;
  /** The show's regular season numbers when known (saves TMDB's details call) */
  seasons?: ReadonlyArray<number>;
}>;

/**
 * Runtimes of many shows by id, from the cache, misses from TMDB (bounded
 * concurrency, one call per 20 seasons). Best-effort: a show TMDB fails to
 * answer, or doesn't know, is absent, and its callers fall back to the
 * series' average. An expired entry still in the table is served, and its
 * refresh waited for only what is left of the request's refresh wait
 * (`refreshWaitMs`); it stores when it ends.
 */
export const getSeriesRuntimes = async (
  requests: ReadonlyArray<Request>,
): Promise<ReadonlyMap<number, SeriesRuntimes>> => {
  const unique = [
    ...new Map(requests.map((request) => [request.id, request])).values(),
  ];
  if (unique.length === 0) {
    return new Map();
  }

  const cached = await readCache(unique.map(({ id }) => id));

  const found = new Map<number, SeriesRuntimes>();
  const missing: Request[] = [];
  const stale: Request[] = [];
  for (const request of unique) {
    const hit = cached.get(cacheKey(request.id));
    if (hit && !hit.expired) {
      if (hit.value) {
        found.set(request.id, hit.value);
      }
    } else if (hit?.value) {
      // Past its 6 hours, not swept yet: served, refreshed below
      found.set(request.id, hit.value);
      stale.push(request);
    } else {
      missing.push(request);
    }
  }

  const loaded = await loadMissingAndStale({
    load: async (request: Request) => {
      try {
        const runtimes =
          (await fetchTvSeriesRuntimes(request.id, request.seasons)) ?? null;
        return [request.id, runtimes] as const;
      } catch (error) {
        logWarn(`Series runtimes fetch failed for ${request.id}`, error);
        return undefined;
      }
    },
    missing,
    stale,
    store: writeCache,
  });
  for (const [id, runtimes] of loaded) {
    if (runtimes) {
      found.set(id, runtimes);
    }
  }

  return found;
};

/**
 * One show's runtimes (the show page's route), undefined for a show TMDB
 * doesn't know. Unlike the batch read, a TMDB failure throws (the route
 * answers 5xx, nothing cached) unless an expired entry can stand in.
 */
export const getSeriesRuntimesOf = async (
  id: number,
): Promise<SeriesRuntimes | undefined> => {
  const entries = await readCache([id]);
  const hit = entries.get(cacheKey(id));
  if (hit && !hit.expired) {
    return hit.value ?? undefined;
  }

  let runtimes: SeriesRuntimes | undefined;
  try {
    runtimes = await fetchTvSeriesRuntimes(id);
  } catch (error) {
    if (hit?.value) {
      logWarn(`Serving expired series runtimes for ${id}`, error);
      return hit.value;
    }
    throw error;
  }

  await writeCache([[id, runtimes ?? null]]);
  return runtimes;
};
