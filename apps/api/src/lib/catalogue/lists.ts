import type { TvSeries } from '@tvseri.es/schemas';
import { getShows } from '@/lib/catalogue/show';
import { readThrough } from '@/lib/db/cache/readThrough';
import {
  fetchImdbTopRatedTvSeries,
  fetchMostPopularThisMonth,
  fetchTrending,
} from '@/lib/mdblist';
import {
  type CreatedShow,
  createdShowsOf,
  pickCreatorOf,
} from '@/lib/tmdb/helpers';
import { fetchRawPersonTvCredits } from '@/lib/tmdb/person';
import { createLimiter } from '@/utils/limit';
import { logWarn } from '@/utils/logWarn';

const CREATED_SHOWS_TTL = 7 * 24 * 60 * 60;

// A person with no created shows (or unknown to TMDB) is asked again after a day
const NO_CREATED_SHOWS_TTL = 24 * 60 * 60;

// Creators looked up per show: writers' rooms can list many
const MAX_CREATORS = 2;

// Parallel person lookups for one trending list
const CREATOR_CONCURRENCY = 10;

/** The shows a person created, most voted first (Cache table, 7 days) */
const fetchCreatedShows = (personId: number) =>
  readThrough<ReadonlyArray<CreatedShow>>(
    `person-created:v1:${personId}`,
    (shows) => (shows.length > 0 ? CREATED_SHOWS_TTL : NO_CREATED_SHOWS_TTL),
    async () => {
      const credits = await fetchRawPersonTvCredits(personId);
      return createdShowsOf(credits?.crew ?? []);
    },
  );

/**
 * `creatorOf` on each show (the hook line's "From the creator of {X}"):
 * one cached lookup per creator, the first two creators of a show only.
 * Best-effort: a failed lookup counts as no other show.
 */
async function withCreatorOf(
  seriesList: ReadonlyArray<TvSeries>,
): Promise<TvSeries[]> {
  const limit = createLimiter(CREATOR_CONCURRENCY);
  const lookups = new Map<number, Promise<ReadonlyArray<CreatedShow>>>();
  const createdShows = (personId: number) => {
    let lookup = lookups.get(personId);
    if (!lookup) {
      lookup = limit(() => fetchCreatedShows(personId)).catch(
        (error: unknown) => {
          logWarn(`Created shows of person ${personId} failed`, error);
          return [];
        },
      );
      lookups.set(personId, lookup);
    }
    return lookup;
  };

  return Promise.all(
    seriesList.map(async (series) => {
      const shows = await Promise.all(
        series.createdBy
          .slice(0, MAX_CREATORS)
          .map((person) => createdShows(person.id)),
      );
      return { ...series, creatorOf: pickCreatorOf(series, shows.flat()) };
    }),
  );
}

export async function fetchTrendingTvSeries() {
  // The spotlight needs preferred backdrops and their dominant colour
  const series = await getShows(await fetchTrending(), {
    artwork: true,
    cast: true,
    colour: true,
  });
  return withCreatorOf(
    series.filter((item) => Boolean(item.posterImage && item.backdropImage)),
  );
}

export async function fetchTopRatedTvSeries() {
  const series = await getShows(await fetchImdbTopRatedTvSeries());
  return series.filter((serie) => !!serie.posterImage);
}

export async function fetchMostPopularTvSeriesThisMonth() {
  const series = await getShows(await fetchMostPopularThisMonth());
  return series.filter((serie) => !!serie.posterImage);
}
