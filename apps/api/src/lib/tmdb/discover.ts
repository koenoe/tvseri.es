import type {
  TmdbDiscoverTvSeriesQuery,
  TmdbExternalSource,
} from '@tvseri.es/schemas';
import { toQueryString } from '@tvseri.es/utils';
import { tmdbFetch } from '@/lib/tmdb/client';
import {
  buildDiscoverQuery,
  deduplicateDiscoverItems,
  GLOBAL_GENRES_TO_IGNORE,
  normalizeTvSeries,
  normalizeTvSeriesEpisode,
} from '@/lib/tmdb/helpers';
import { logWarn } from '@/utils/logWarn';

export async function fetchDiscoverTvSeries(query?: TmdbDiscoverTvSeriesQuery) {
  const queryString = toQueryString(buildDiscoverQuery(query));

  const response = await tmdbFetch('/3/discover/tv', {
    search: queryString,
  });

  const items = (response?.results ?? []).map((series) =>
    normalizeTvSeries(series),
  );

  return {
    items,
    queryString: query ? toQueryString(query) : '',
    totalNumberOfItems: response?.total_results,
    totalNumberOfPages: response?.total_pages,
  };
}

/**
 * How many shows a discover query matches (TMDB's `total_results`), for facts.
 * Counts every show with an air date: no vote floor, unlike discover lists.
 */
export async function fetchDiscoverCount(
  query: TmdbDiscoverTvSeriesQuery,
): Promise<number> {
  const queryString = toQueryString(
    buildDiscoverQuery({ ...query, 'vote_count.gte': 0 }),
  );
  const response = await tmdbFetch('/3/discover/tv', { search: queryString });

  return response?.total_results ?? 0;
}

export async function fetchPopularTvSeriesByYear(year: number | string) {
  const withoutGenres = [...GLOBAL_GENRES_TO_IGNORE, 10764, 16];
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const query = {
    'first_air_date.gte': startDate,
    'first_air_date.lte': endDate,
    sort_by: 'vote_average.desc',
    'vote_count.gte': 250,
    without_genres: withoutGenres.join(','),
  } as const;

  // Pages 1-5 in parallel; pages past the last one are dropped, so the result
  // is the same as fetching page 1 first and then only the pages that exist.
  // Only page 1 failing fails the response: a failed page 2-5 is skipped
  // (logged), and an empty one adds nothing
  const [firstPage, ...otherPages] = await Promise.all([
    fetchDiscoverTvSeries({ ...query, page: 1 }),
    ...[2, 3, 4, 5].map((page) =>
      fetchDiscoverTvSeries({ ...query, page }).catch((error: unknown) => {
        logWarn(`Popular ${year}: page ${page} failed, skipping it`, error);
        return null;
      }),
    ),
  ]);
  const additionalPages = otherPages.flatMap((page, i) =>
    // Past the last page (or no page count at all)
    page && i + 2 <= (firstPage.totalNumberOfPages ?? 0) ? [page] : [],
  );

  return deduplicateDiscoverItems([firstPage, ...additionalPages]).filter(
    (item) =>
      !!item.posterImage &&
      !!item.backdropImage &&
      !item.genres?.some((genre) => withoutGenres.includes(genre.id)),
  );
}

export async function searchTvSeries(
  query: string,
  {
    year,
  }: Readonly<{
    year?: number | string;
  }> = {},
) {
  const params = new URLSearchParams({
    include_adult: 'false',
    page: '1',
    query,
    ...(year && { year: `${year}` }),
  });
  const tvSeriesResponse = await tmdbFetch('/3/search/tv', {
    search: `?${params.toString()}`,
  });

  return (tvSeriesResponse?.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => normalizeTvSeries(series));
}

export async function findByExternalId({
  externalId,
  externalSource,
}: Readonly<{
  externalId: string;
  externalSource: TmdbExternalSource;
}>) {
  const response = await tmdbFetch(
    `/3/find/${encodeURIComponent(externalId)}`,
    { query: { external_source: externalSource } },
  );

  const tvSeries = (response?.tv_results ?? []).map((series) =>
    normalizeTvSeries(series),
  );
  const episodes = (response?.tv_episode_results ?? []).map((episode) => ({
    ...normalizeTvSeriesEpisode(episode),
    tvSeriesId: episode.show_id,
  }));
  const seasons = (response?.tv_season_results ?? []).map((season) => {
    return {
      airDate: season.air_date ? new Date(season.air_date).toISOString() : '',
      description: season.overview ?? '',
      episodes: [],
      id: season.id,
      numberOfEpisodes: episodes.length,
      seasonNumber: season.season_number,
      title: season.name as string,
    };
  });

  return {
    episodes,
    seasons,
    tvSeries,
  };
}
