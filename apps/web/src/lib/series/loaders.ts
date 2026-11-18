import 'server-only';

import type {
  CrewCredit,
  EpisodeWithCredits,
  Person,
  Season,
  SeasonRatings,
  SeriesRuntimes,
  TvSeries,
  WatchProvider,
} from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';

import { apiFetch } from '@/lib/api/client';
import { tags } from '@/lib/cache/tags';
import {
  cacheLifeFor,
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

/**
 * Cached reads of a show, shared by the show page and the marking actions,
 * so both hit the same cache entries. Profiles match the API's
 * Cache-Control.
 *
 * `loadSeries` and `loadSeriesCredits` are the one cached read of their URL
 * and answer an outage with `Unavailable` (`tryApi` inside the cached scope,
 * the only place the `ApiError` is still one: a thrown error reaches the
 * caller of a cached function as a plain `Error`, so a caller's own `tryApi`
 * could never see the outage).
 */

/**
 * `GET /series/:id` with images, uncached: null on 404, throws `ApiError`.
 * Only `loadSeries` and a write that won't trust a cached outage
 * (`loadSeriesForWrite`) read it.
 */
export const readSeries = (id: number): Promise<TvSeries | null> =>
  apiFetch<TvSeries>('/series/:id', {
    notFound: 'null',
    params: { id },
    query: { include_images: true },
  });

/**
 * `GET /series/:id` with images (title treatment, backdrop): null on 404,
 * `Unavailable` on an outage (cached for the `unavailable` life).
 */
export async function loadSeries(
  id: number,
): Promise<TvSeries | null | Unavailable> {
  'use cache';
  cacheTag(tags.series(id));
  const series = await tryApi(() => readSeries(id));
  cacheLifeFor('short', series);
  if (isUnavailable(series)) {
    failedFills.set(id, failedFillsOf(id) + 1);
  }
  return series;
}

/**
 * How many of a show's `loadSeries` fills failed in this server instance:
 * a write tells a failure of the fill its own call ran (a cold entry) from
 * a cached one (`loadSeriesForWrite`). One small number per show that ever
 * failed.
 */
const failedFills = new Map<number, number>();

export const failedFillsOf = (id: number): number => failedFills.get(id) ?? 0;

/**
 * `loadSeries` where the show is a nicety (a logo, a colour, a card): any
 * failure reads as no show. An outage silently; anything else (a 400, an
 * invalid body: a bug) is logged once here, so callers need no catch.
 */
export async function loadSeriesOrNull(id: number): Promise<TvSeries | null> {
  try {
    const series = await loadSeries(id);
    return isUnavailable(series) ? null : series;
  } catch (error) {
    unstable_rethrow(error);
    console.error('[series] read failed', { error, id });
    return null;
  }
}

/**
 * `GET /series/:id/season/:n`; null on 404. Deliberately separate from the
 * show page's `loadSeasonEpisodes` and the Remote's client fetch: different
 * data shapes, cache entries and failure handling.
 */
export async function loadSeason(
  id: number,
  seasonNumber: number,
): Promise<Season | null> {
  'use cache';
  cacheLife('short');
  cacheTag(tags.series(id));
  return apiFetch<Season>('/series/:id/season/:season', {
    notFound: 'null',
    params: { id, season: seasonNumber },
  });
}

/** `GET /series/:id/watch-providers?region=` (per id and region). */
export async function loadWatchProviders(
  id: number,
  region: string,
): Promise<ReadonlyArray<WatchProvider>> {
  'use cache';
  cacheLife('short');
  cacheTag(tags.series(id));
  return (
    (await apiFetch<WatchProvider[]>('/series/:id/watch-providers', {
      notFound: 'null',
      params: { id },
      query: { region },
    })) ?? []
  );
}

/** `GET /series/:id/season/:s/episode/:e?view=credits`; null on 404. */
export async function loadEpisodeWithCredits(
  id: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<EpisodeWithCredits | null> {
  'use cache';
  cacheLife('short');
  cacheTag(tags.series(id));
  return apiFetch<EpisodeWithCredits>(
    '/series/:id/season/:season/episode/:episode',
    {
      notFound: 'null',
      params: { episode: episodeNumber, id, season: seasonNumber },
      query: { view: 'credits' },
    },
  );
}

/**
 * A crew row as the API sends it, or as it sent it before the crew kept its
 * department and jobs (one `job`): an old answer can still be in a cache
 */
type CrewRow = Readonly<{
  department?: string;
  id: number;
  image: string;
  job?: string;
  jobs?: CrewCredit['jobs'];
  name: string;
  numberOfEpisodes?: number;
  slug: string;
}>;

type SeriesCredits = Readonly<{
  cast: ReadonlyArray<Person>;
  crew: ReadonlyArray<CrewRow>;
}>;

/** A show's credits as the web reads them: the regulars and the crew */
type SeriesCast = Readonly<{
  cast: ReadonlyArray<Person>;
  crew: ReadonlyArray<CrewCredit>;
}>;

/** An old row lands in the Crew section with its one job */
const toCrewCredit = (row: CrewRow): CrewCredit => ({
  department: row.department ?? '',
  id: row.id,
  image: row.image,
  jobs:
    row.jobs ??
    (row.job ? [{ episodes: row.numberOfEpisodes ?? 0, job: row.job }] : []),
  name: row.name,
  numberOfEpisodes: row.numberOfEpisodes ?? 0,
  slug: row.slug,
});

/**
 * The credits response's shape. Bump it whenever that shape changes: it rides
 * in the request (the API's CDN keys on the query) and in this cache's key, so
 * neither serves a week-old answer in the old shape (the crew without its
 * departments filed every crew member under "Crew").
 */
const CREDITS_SHAPE = 2;

/**
 * `GET /series/:id/credits`, trimmed inside the cache to the cast and the
 * crew rows: null on 404, `Unavailable` on an outage.
 */
export const loadSeriesCredits = (
  id: number,
): Promise<SeriesCast | null | Unavailable> =>
  loadSeriesCreditsShaped(id, CREDITS_SHAPE);

async function loadSeriesCreditsShaped(
  id: number,
  shape: number,
): Promise<SeriesCast | null | Unavailable> {
  'use cache';
  cacheTag(tags.series(id));
  const credits = await tryApi(() =>
    apiFetch<SeriesCredits>('/series/:id/credits', {
      notFound: 'null',
      params: { id },
      query: { shape },
    }),
  );
  cacheLifeFor('medium', credits);
  if (isUnavailable(credits)) {
    return credits;
  }
  return (
    credits && {
      cast: credits.cast,
      crew: (credits.crew ?? []).map(toCrewCredit),
    }
  );
}

/**
 * `GET /series/:id/season/:s/ratings` (IMDb per episode, via OMDb); null on
 * 404. The API answers `{ ratings: {} }` both when there is nothing to rate
 * and when OMDb is unavailable (then `no-store`), and the body can't tell
 * them apart: an empty answer is kept for the short `unavailable` life only,
 * so a temporary gap is never pinned for the `medium` week (one `cacheLife`
 * per run, decided after the read).
 */
export async function loadSeasonRatings(
  id: number,
  seasonNumber: number,
): Promise<SeasonRatings | null> {
  'use cache';
  cacheTag(tags.series(id));
  const result = await apiFetch<SeasonRatings>(
    '/series/:id/season/:season/ratings',
    { notFound: 'null', params: { id, season: seasonNumber } },
  );
  cacheLifeFor(result && isEmptyRatings(result) ? 'unavailable' : 'medium');
  return result;
}

/** No episode of the season has a rating (or OMDb was unavailable). */
export const isEmptyRatings = (ratings: SeasonRatings) =>
  Object.keys(ratings.ratings).length === 0;

/**
 * Runtimes in minutes of every regular season's episodes, by season number
 * (`{ 1: [28, 32, …] }`, index = episode number − 1): the hero's time left
 * and the Information block's runtime range. One read for the whole show
 * (`GET /series/:id/runtimes`), never a request per season.
 */
export async function loadRuntimes(
  id: number,
): Promise<SeriesRuntimes | Unavailable> {
  'use cache';
  cacheTag(tags.series(id));
  const runtimes = await tryApi(() =>
    apiFetch<SeriesRuntimes>('/series/:id/runtimes', {
      notFound: 'null',
      params: { id },
    }),
  );
  // No show: nothing to draw, and nothing worth keeping for a day
  cacheLifeFor(runtimes ? 'short' : 'unavailable', runtimes);
  if (isUnavailable(runtimes)) {
    return runtimes;
  }
  return runtimes ?? {};
}
