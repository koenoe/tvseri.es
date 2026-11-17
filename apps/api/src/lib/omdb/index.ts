import type { SeasonRatings } from '@tvseri.es/schemas';
import { Resource } from 'sst';

import { readThroughStale } from '@/lib/db/cache/readThroughStale';
import { createInstrumentedFetch } from '@/lib/metrics';
import {
  nextUtcMidnight,
  takeAllowanceOrThrow,
} from '@/lib/upstream/allowance';
import { upstreamBaseUrl } from '@/lib/upstream/baseUrl';
import { breakerFor } from '@/lib/upstream/breaker';
import { UpstreamUnavailableError } from '@/lib/upstream/errors';
import { logWarn } from '@/utils/logWarn';

/**
 * IMDb ratings, for shows (the show page) and episodes (the episode modal),
 * from OMDb (https://www.omdbapi.com/, by IMDb id: `?i=tt…`, with `Season=`
 * for a season's episodes). Ratings are optional on every page: what OMDb
 * can't answer now, the page draws without.
 *
 * - Stored per show and per season (readThroughStale): a found rating is
 *   fresh for 14 days, a title OMDb doesn't know for 1 day; a stored copy is
 *   served, however old, whenever OMDb can't be asked; errors and the quota
 *   message are never stored.
 * - Every call takes one from OMDb's daily allowance (one Cache-table counter
 *   per UTC day, DAILY_CAP): past it, no call until the next day.
 * - "Request limit reached!" (OMDb answers it as a 401, per its issue
 *   tracker: github.com/omdbapi/OMDb-API/issues/55) opens OMDb's breaker
 *   until midnight UTC for every instance.
 */

/**
 * Calls a day across every Lambda, well under the paid plan's 100,000.
 * Lower it to 800 if the key is ever the free one (1,000 a day) again.
 */
export const DAILY_CAP = 80_000;

const FOUND_FRESH = 14 * 86_400;
const NOT_FOUND_FRESH = 86_400;
/** How long a copy is kept to stand in when OMDb can't be asked */
const KEEP = 180 * 86_400;

const breaker = breakerFor('omdb');

// No retry: every request counts against the daily quota
const $fetch = createInstrumentedFetch(
  'omdb',
  { baseURL: upstreamBaseUrl('OMDB', 'https://www.omdbapi.com') },
  { breaker, retries: 0 },
);

/** What OMDb answers (as a 401) once the day's requests are spent */
const LIMIT_REACHED = 'Request limit reached!';

// "Request limit reached!", a bad key... are not facts about the title
const NOT_FOUND_ERRORS = new Set([
  'Incorrect IMDb ID.',
  'Movie not found!',
  'Series not found!',
  'Series or season not found!',
  'Season not found!',
]);

type OmdbAnswer = Readonly<{
  Error?: string;
  Response?: 'False' | 'True';
}>;

type OmdbSeason = OmdbAnswer &
  Readonly<{
    Episodes?: ReadonlyArray<
      Readonly<{ Episode?: string; imdbRating?: string }>
    >;
  }>;

/** `?i=tt…`: `imdbRating` "8.6" or "N/A", `imdbVotes` "1,092,532" or "N/A" */
type OmdbTitle = OmdbAnswer &
  Readonly<{ imdbRating?: string; imdbVotes?: string }>;

const readApiKey = () => {
  try {
    return Resource.OmdbApiKey.value;
  } catch {
    return '';
  }
};

/**
 * One OMDb request: undefined for a title (or season) OMDb doesn't know;
 * throws when it can't be asked (no key, breaker open, allowance spent,
 * quota hit, an error).
 */
const omdbGet = async <T extends OmdbAnswer>(
  query: Record<string, string>,
): Promise<T | undefined> => {
  const apiKey = readApiKey();
  if (!apiKey) {
    throw new Error('OMDb has no key');
  }
  await takeAllowanceOrThrow('omdb', DAILY_CAP, breaker);

  const { data, error } = await $fetch<T>('/', {
    query: { ...query, apikey: apiKey },
  });
  const message =
    data?.Error ?? (error as Readonly<{ Error?: string }> | null)?.Error;
  if (message === LIMIT_REACHED) {
    await breaker.openUntil(nextUtcMidnight(), 'daily limit reached');
    throw new UpstreamUnavailableError('omdb', 3600, 'daily limit reached');
  }
  if (error || !data) {
    throw new Error(`OMDb answered ${error?.status ?? 'nothing'}`);
  }
  if (data.Response === 'True') {
    return data;
  }
  if (data.Error && NOT_FOUND_ERRORS.has(data.Error)) {
    return undefined;
  }
  throw new Error(`OMDb answered ${data.Error ?? 'an error'}`);
};

/** OMDb's number, or null for "N/A" and anything unreadable */
const toNumber = (value: string | undefined) => {
  const number = Number((value ?? '').replaceAll(',', ''));
  return value && Number.isFinite(number) && number > 0 ? number : null;
};

const toRatings = (season: OmdbSeason): SeasonRatings => {
  const ratings: Record<string, { imdbRating: number | null }> = {};
  for (const episode of season.Episodes ?? []) {
    ratings[String(Number(episode.Episode))] = {
      imdbRating: toNumber(episode.imdbRating),
    };
  }
  return { ratings };
};

type Stored<T> = Readonly<{ found: boolean; value: T }>;

const lifeOf = <T>(stored: Stored<T>) =>
  stored.found ? FOUND_FRESH : NOT_FOUND_FRESH;

/**
 * The IMDb ratings of one season's episodes, by episode number (one OMDb call
 * per season). `definitive` tells the caller whether the answer may be
 * cached: false when OMDb couldn't be asked and nothing was stored.
 */
export const fetchSeasonRatings = async (
  imdbId: string,
  season: number | string,
): Promise<Readonly<{ definitive: boolean; ratings: SeasonRatings }>> => {
  const empty: SeasonRatings = { ratings: {} };
  try {
    const stored = await readThroughStale<Stored<SeasonRatings>>(
      `omdb:v2:${imdbId}:${season}`,
      lifeOf,
      KEEP,
      async () => {
        const answer = await omdbGet<OmdbSeason>({
          i: imdbId,
          Season: String(season),
        });
        return answer
          ? { found: true, value: toRatings(answer) }
          : { found: false, value: empty };
      },
    );
    return { definitive: true, ratings: stored.value };
  } catch (error) {
    logWarn('OMDb season ratings unavailable', error);
    return { definitive: false, ratings: empty };
  }
};

export type ShowImdbRating = Readonly<{ value: number; votes: number }>;

/**
 * A show's IMDb rating and vote count (one OMDb call per show), null when it
 * has none ("N/A") or OMDb doesn't know it. Throws when OMDb can't be asked
 * and nothing is stored (the route answers "unavailable").
 */
export const fetchShowRating = async (
  imdbId: string,
): Promise<ShowImdbRating | null> => {
  const stored = await readThroughStale<Stored<ShowImdbRating | null>>(
    `omdb-title:v1:${imdbId}`,
    lifeOf,
    KEEP,
    async () => {
      const answer = await omdbGet<OmdbTitle>({ i: imdbId });
      if (!answer) {
        return { found: false, value: null };
      }
      const value = toNumber(answer.imdbRating);
      return {
        found: true,
        value: value ? { value, votes: toNumber(answer.imdbVotes) ?? 0 } : null,
      };
    },
  );
  return stored.value;
};
