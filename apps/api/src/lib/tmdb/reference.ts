import { CACHE_LIFE } from '@tvseri.es/constants';
import type {
  CountryOrLanguage,
  Genre,
  Network,
  TmdbNetwork,
} from '@tvseri.es/schemas';
import { readThrough } from '@/lib/db/cache/readThrough';
import { tmdbFetch } from '@/lib/tmdb/client';
import { GLOBAL_GENRES_TO_IGNORE, normalizeNetwork } from '@/lib/tmdb/helpers';

/**
 * TMDB's TV genres, stored for a month (reference data, the same for every
 * viewer: Home's More {genre}, Match, Circle, landings and Where to start)
 */
export async function fetchGenresForTvSeries() {
  const genresResponse =
    (await readThrough(
      'tmdb-genres:v1',
      CACHE_LIFE.long.sMaxAge,
      async () => (await tmdbFetch('/3/genre/tv/list')) ?? null,
    )) ?? {};
  const genres = (genresResponse.genres ?? []).filter(
    (genre) => !GLOBAL_GENRES_TO_IGNORE.includes(genre.id),
  ) as Genre[];

  return genres;
}

export async function fetchCountries() {
  const response = await tmdbFetch('/3/configuration/countries');

  return (response ?? [])
    .map(
      (country): CountryOrLanguage => ({
        code: String(country.iso_3166_1),
        englishName: String(country.english_name),
        name: String(country.native_name),
      }),
    )
    .sort((a, b) => {
      const key = a.englishName && b.englishName ? 'englishName' : 'name';
      return a[key].localeCompare(b[key]);
    });
}

export async function fetchLanguages() {
  const response = await tmdbFetch('/3/configuration/languages');

  return (response ?? [])
    .map(
      (language): CountryOrLanguage => ({
        code: String(language.iso_639_1),
        englishName: String(language.english_name),
        name: String(language.name),
      }),
    )
    .sort((a, b) => {
      const key = a.englishName && b.englishName ? 'englishName' : 'name';
      return a[key].localeCompare(b[key]);
    });
}

/**
 * A network's TMDB facts (its logo, country), stored for a month (reference
 * data that rarely changes: the network page and What's on's caption read it
 * every day, TMDB is asked once a month per network). With its logo's path,
 * for the logo check.
 */
export async function fetchNetworkDetails(
  id: number,
): Promise<Readonly<{ logoPath?: string; network: Network }> | undefined> {
  const response = await readThrough<TmdbNetwork | null>(
    `tmdb-network:v1:${id}`,
    (value) => (value ? CACHE_LIFE.long.sMaxAge : false),
    async () => (await tmdbFetch(`/3/network/${id}`)) ?? null,
  );
  return response
    ? { logoPath: response.logo_path, network: normalizeNetwork(response) }
    : undefined;
}
