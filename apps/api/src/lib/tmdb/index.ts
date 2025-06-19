import { type BetterFetchOption, createFetch } from '@better-fetch/fetch';
import type {
  Account,
  CountryOrLanguage,
  Genre,
  Keyword,
  Movie,
  Person,
  TmdbTvSeries,
  TmdbDiscoverTvSeriesQuery,
  TmdbMovie,
  TmdbTvSeriesEpisode,
  TmdbTvSeriesCredits,
  Episode,
  Season,
  TvSeries,
  WatchProvider,
  TmdbTvSeriesImages,
  TmdbTvSeriesContentRatings,
  TmdbTvSeriesWatchProviders,
  TmdbTvSeriesRecommendations,
  TmdbTvSeriesSimilar,
  TmdbTvSeriesKeywords,
  TmdbTvSeriesSeason,
  TmdbTrendingTvSeries,
  TmdbDiscoverTvSeries,
  TmdbAccountDetails,
  TmdbGenresForTvSeries,
  TmdbSearchTvSeries,
  TmdbWatchProviders,
  TmdbCountries,
  TmdbLanguages,
  TmdbKeyword,
  TmdbKeywords,
  TmdbSearchPerson,
  TmdbPerson,
  TmdbPersonTvCredits,
  TmdbExternalSource,
  TmdbFindByIdResults,
} from '@tvseri.es/types';
import slugify from 'slugify';
import { Resource } from 'sst';

import { findPreferredImages } from '../db/preferredImages';
import detectDominantColorFromImage from '../detectDominantColorFromImage';
import {
  fetchImdbTopRatedTvSeries,
  fetchKoreasFinest,
  fetchMostPopularThisMonth,
} from '../mdblist';
import {
  GLOBAL_GENRES_TO_IGNORE,
  buildBackdropImageUrl,
  buildDiscoverQuery,
  buildTitleTreatmentImageUrl,
  generateTmdbImageUrl,
  normalizeMovie,
  normalizePersons,
  normalizeTvSeries,
  normalizeTvSeriesEpisode,
} from './helpers';
import {
  DEFAULT_FETCH_RETRY_OPTIONS,
  WATCH_PROVIDER_PRIORITY,
} from '@/constants';
import calculateAge from '@/utils/calculateAge';
import { toQueryString } from '@/utils/toQueryString';

const tmdbApiKey = Resource.TmdbApiKey.value;
const tmdbApiAccessToken = Resource.TmdbApiAccessToken.value;

if (!tmdbApiKey || !tmdbApiAccessToken) {
  throw new Error('No "API_KEY" found for TMDb');
}

const $fetch = createFetch({
  baseURL: 'https://api.themoviedb.org',
  retry: DEFAULT_FETCH_RETRY_OPTIONS,
});

async function tmdbFetch(path: string, options?: BetterFetchOption) {
  const headers = {
    'content-type': 'application/json',
    ...(path.startsWith('/4/') && {
      Authorization: `Bearer ${tmdbApiAccessToken}`,
    }),
  };

  const { data, error } = await $fetch(path, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
    query: {
      ...(path.startsWith('/3/') && {
        api_key: tmdbApiKey,
      }),
    },
  });

  if (error?.status === 404) {
    return undefined;
  }

  if (error) {
    throw new Error(`HTTP error status: ${error.status}`);
  }

  return data;
}

export async function createRequestToken(redirectUri: string) {
  const response = (await tmdbFetch('/4/auth/request_token', {
    method: 'POST',
    body: JSON.stringify({
      redirect_to: redirectUri,
    }),
  })) as Readonly<{
    success: boolean;
    status_code: number;
    status_message: string;
    request_token: string;
  }>;

  if (!response.success) {
    console.error('Failed to create request token in TMDb:', response);
  }

  return response.request_token ?? '';
}

export async function createAccessToken(requestToken: string) {
  const response = (await tmdbFetch('/4/auth/access_token', {
    method: 'POST',
    body: JSON.stringify({
      request_token: requestToken,
    }),
  })) as Readonly<{
    success: boolean;
    status_code: number;
    status_message: string;
    account_id: string;
    access_token: string;
  }>;

  if (!response.success) {
    console.error('Failed to create access token in TMDb:', response);
    return {
      accountObjectId: null,
      accessToken: null,
    };
  }

  return {
    accountObjectId: response?.account_id,
    accessToken: response?.access_token,
  };
}

export async function createSessionId(accessToken: string) {
  const response = (await tmdbFetch('/3/authentication/session/convert/4', {
    method: 'POST',
    body: JSON.stringify({
      access_token: accessToken,
    }),
  })) as Readonly<{
    success: boolean;
    session_id: string;
  }>;

  if (!response.success) {
    console.error('Failed to create session in TMDb:', response);
    return '';
  }

  return response.session_id;
}

export async function deleteSessionId(sessionId: string) {
  await tmdbFetch('/3/authentication/session', {
    method: 'DELETE',
    body: JSON.stringify({
      session_id: sessionId,
    }),
  });
}

export async function deleteAccessToken(accessToken: string) {
  await tmdbFetch('/4/auth/access_token', {
    method: 'DELETE',
    body: JSON.stringify({
      access_token: accessToken,
    }),
  });
}

export async function fetchAccountDetails(sessionId: string) {
  const response = (await tmdbFetch(
    `/3/account?session_id=${sessionId}`,
  )) as TmdbAccountDetails;

  return {
    id: response?.id,
    name: response?.name,
    username: response?.username,
    avatar: response.avatar?.gravatar
      ? `https://www.gravatar.com/avatar/${response.avatar.gravatar.hash}`
      : undefined,
  } as Account;
}

export async function fetchTvSeries(
  id: number | string,
  options: Readonly<{ includeImages?: boolean }> = { includeImages: false },
): Promise<TvSeries | undefined> {
  const series = (await tmdbFetch(`/3/tv/${id}`)) as TmdbTvSeries;

  if (!series) {
    return undefined;
  }

  const [preferredImages, images] = await Promise.all([
    findPreferredImages(series.id),
    options.includeImages
      ? (tmdbFetch(
          `/3/tv/${series.id}/images?include_image_language=en,null,${series.original_language}`,
        ) as Promise<TmdbTvSeriesImages>)
      : Promise.resolve(undefined),
  ]);

  // Note: ewwwww, (ಥ﹏ಥ)
  if (images) {
    series.images = images;
  }

  const normalizedTvSeries = normalizeTvSeries(series);

  if (preferredImages && preferredImages.backdropImagePath) {
    return {
      ...normalizedTvSeries,
      backdropColor: preferredImages.backdropColor,
      backdropImage: buildBackdropImageUrl(preferredImages.backdropImagePath),
      ...(preferredImages.titleTreatmentImagePath && {
        titleTreatmentImage: buildTitleTreatmentImageUrl(
          preferredImages.titleTreatmentImagePath,
        ),
      }),
    };
  }

  if (normalizedTvSeries.backdropImage) {
    const backdropColor = await detectDominantColorFromImage(
      normalizedTvSeries.backdropImage.replace(
        'w1920_and_h1080_multi_faces',
        'w780',
      ),
      normalizedTvSeries.backdropPath!,
    );

    return {
      ...normalizedTvSeries,
      backdropColor,
    };
  }

  return normalizedTvSeries;
}

export async function fetchTvSeriesImages(
  id: number | string,
  originalLanguage?: string,
) {
  const response = (await tmdbFetch(
    `/3/tv/${id}/images?include_image_language=en,null,${originalLanguage}`,
  )) as TmdbTvSeriesImages;

  if (!response) {
    return undefined;
  }

  return {
    backdrops: await Promise.all(
      (response.backdrops ?? [])
        .filter(
          (backdrop) => !!backdrop.file_path && backdrop.iso_639_1 === null,
        )
        .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
        .map(async (backdrop) => {
          const url = buildBackdropImageUrl(backdrop.file_path!);

          return {
            path: backdrop.file_path!,
            url,
          };
        }),
    ),
    titleTreatment: (response.logos ?? [])
      .filter((logo) => !!logo.file_path)
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .map((logo) => {
        return {
          path: logo.file_path!,
          url: buildTitleTreatmentImageUrl(logo.file_path!),
        };
      }),
  };
}

export async function fetchTvSeriesContentRating(
  id: number | string,
  region = 'US',
): Promise<string | undefined | null> {
  const contentRatings = (await tmdbFetch(
    `/3/tv/${id}/content_ratings`,
  )) as TmdbTvSeriesContentRatings;

  const contentRating =
    contentRatings.results?.find((rating) => rating.iso_3166_1 === region)
      ?.rating ?? null;

  return contentRating;
}

export async function fetchTvSeriesWatchProviders(
  id: number | string,
  region = 'US',
): Promise<WatchProvider[]> {
  const watchProviders = (await tmdbFetch(
    `/3/tv/${id}/watch/providers`,
  )) as TmdbTvSeriesWatchProviders;

  const flatrate =
    watchProviders.results?.[region as keyof typeof watchProviders.results]
      ?.flatrate ?? [];

  // TODO: generate new types from OpenAPI
  // prettier-ignore
  const free =
    (watchProviders.results?.[region as keyof typeof watchProviders.results]
       // @ts-expect-error it does exist
      ?.free as typeof flatrate) ?? [];

  const providers = [...free, ...flatrate];

  return providers
    .sort((a, b) => {
      const aPriority =
        WATCH_PROVIDER_PRIORITY[a.provider_name!] ?? a.display_priority ?? 0;
      const bPriority =
        WATCH_PROVIDER_PRIORITY[b.provider_name!] ?? b.display_priority ?? 0;
      return aPriority - bPriority;
    })
    .map((provider) => ({
      id: provider.provider_id,
      name: provider.provider_name as string,
      logo: provider.logo_path
        ? generateTmdbImageUrl(provider.logo_path, 'w92')
        : '',
      logoPath: provider.logo_path!,
    }));
}

export async function fetchTvSeriesWatchProvider(
  id: number | string,
  region = 'US',
): Promise<WatchProvider | null> {
  const watchProviders = await fetchTvSeriesWatchProviders(id, region);
  const watchProvider = watchProviders[0] ?? null;

  return watchProvider;
}

export async function fetchTvSeriesCredits(
  id: number | string,
): Promise<Readonly<{ cast: Person[]; crew: Person[] }>> {
  const credits = (await tmdbFetch(
    `/3/tv/${id}/aggregate_credits`,
  )) as TmdbTvSeriesCredits;

  if (!credits.cast) {
    return {
      cast: [],
      crew: [],
    };
  }

  const cast =
    credits.cast
      .filter((item) => !!item.profile_path)
      .sort((a, b) => a.order - b.order) ?? [];

  return {
    cast: normalizePersons(cast),
    crew: normalizePersons(credits.crew),
  };
}

export async function fetchTvSeriesRecommendations(
  id: number | string,
): Promise<TvSeries[]> {
  const response = (await tmdbFetch(
    `/3/tv/${id}/recommendations`,
  )) as TmdbTvSeriesRecommendations;

  return (response.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => {
      return normalizeTvSeries(series as TmdbTvSeries);
    });
}

export async function fetchTvSeriesSimilar(
  id: number | string,
): Promise<TvSeries[]> {
  const response = (await tmdbFetch(
    `/3/tv/${id}/similar`,
    {},
  )) as TmdbTvSeriesSimilar;

  return (response.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => {
      return normalizeTvSeries(series as TmdbTvSeries);
    });
}

export async function fetchTvSeriesKeywords(
  id: number | string,
): Promise<Keyword[] | undefined> {
  const { results } = (await tmdbFetch(
    `/3/tv/${id}/keywords`,
  )) as TmdbTvSeriesKeywords;

  return results?.map((keyword) => ({
    id: keyword.id,
    name: String(keyword.name),
  }));
}

export async function fetchTvSeriesSeason(
  id: number | string,
  season: number | string,
): Promise<Season | undefined> {
  const response = (await tmdbFetch(
    `/3/tv/${id}/season/${season}`,
  )) as TmdbTvSeriesSeason;

  if (!response) {
    return undefined;
  }

  const episodes = (response?.episodes ?? []).map((episode) =>
    normalizeTvSeriesEpisode(episode as unknown as TmdbTvSeriesEpisode),
  );
  const numberOfEpisodes = episodes.length;
  const numberOfAiredEpisodes =
    episodes.filter((episode) => episode.hasAired).length ?? numberOfEpisodes;
  const airDate = response.air_date
    ? new Date(response.air_date).toISOString()
    : '';

  return {
    id: response.id,
    title: response.name as string,
    description: response.overview ?? '',
    airDate,
    hasAired: new Date(airDate) <= new Date(),
    seasonNumber: response.season_number,
    numberOfEpisodes,
    numberOfAiredEpisodes,
    episodes,
  };
}

export async function fetchTvSeriesEpisode(
  id: number | string,
  season: number | string,
  episode: number | string,
): Promise<Episode> {
  const response = (await tmdbFetch(
    `/3/tv/${id}/season/${season}/episode/${episode}`,
  )) as TmdbTvSeriesEpisode;

  return normalizeTvSeriesEpisode(response);
}

export async function fetchTrendingTvSeries() {
  const trendingTvSeriesResponse =
    ((await tmdbFetch('/3/trending/tv/day')) as TmdbTrendingTvSeries) ?? [];

  const ids = (trendingTvSeriesResponse.results ?? [])
    .filter(
      (series) =>
        series.backdrop_path &&
        series.genre_ids &&
        series.genre_ids?.length > 0 &&
        series.vote_count > 0 &&
        !series.genre_ids?.some((genre) =>
          [...GLOBAL_GENRES_TO_IGNORE, 16, 10762, 10764, 10766].includes(genre),
        ),
    )
    .map((series) => series.id)
    .slice(0, 10);

  const series = await Promise.all(
    ids.map(async (id) => {
      const serie = await fetchTvSeries(id, {
        includeImages: true,
      });
      return serie as TvSeries;
    }),
  );

  return series;
}

export async function fetchTopRatedTvSeries() {
  const topRatedIds = await fetchImdbTopRatedTvSeries();
  const series = await Promise.all(
    topRatedIds.map(async (id) => {
      const serie = await fetchTvSeries(id);
      return serie as TvSeries;
    }),
  );
  return series;
}

export async function fetchDiscoverTvSeries(query?: TmdbDiscoverTvSeriesQuery) {
  const queryString = toQueryString(buildDiscoverQuery(query));

  const response =
    ((await tmdbFetch(
      `/3/discover/tv${queryString}`,
    )) as TmdbDiscoverTvSeries) ?? [];

  const items = (response.results ?? []).map((series) =>
    normalizeTvSeries(series as TmdbTvSeries),
  );

  return {
    items,
    totalNumberOfPages: response.total_pages,
    totalNumberOfItems: response.total_results,
    queryString: query ? toQueryString(query) : '',
  };
}

export async function fetchPopularBritishCrimeTvSeries() {
  const { items } = await fetchDiscoverTvSeries({
    language: 'en-GB',
    sort_by: 'popularity.desc',
    'vote_count.gte': 250,
    watch_region: 'GB',
    with_genres: '80',
    without_genres: '10766',
    with_origin_country: 'GB',
    with_original_language: 'en',
  });
  return items.filter((item) => !!item.posterImage && !!item.backdropImage);
}

export async function fetchBestSportsDocumentariesTvSeries() {
  const { items } = await fetchDiscoverTvSeries({
    sort_by: 'vote_average.desc',
    'vote_count.gte': 7,
    with_genres: '99',
    without_genres: '35',
    with_keywords: '6075|2702',
    without_keywords: '10596,293434,288928,11672',
  });
  return items.filter((item) => !!item.posterImage && !!item.backdropImage);
}

export async function fetchApplePlusTvSeries(region = 'US') {
  const { items } = await fetchDiscoverTvSeries({
    sort_by: 'vote_average.desc',
    'vote_count.gte': 250,
    without_genres: '99',
    watch_region: region,
    with_watch_providers: '350',
  });
  return items.filter((item) => !!item.posterImage && !!item.backdropImage);
}

export async function fetchMostAnticipatedTvSeries() {
  const withoutGenres = [...GLOBAL_GENRES_TO_IGNORE, 16, 10762, 10764, 10766];
  const { items } = await fetchDiscoverTvSeries({
    without_genres: withoutGenres.join(','),
    'first_air_date.gte': new Date().toISOString().split('T')[0],
    'vote_count.gte': 0,
  });

  return items.filter(
    (item) =>
      !!item.posterImage &&
      !!item.backdropImage &&
      // Note: somehow we still get some series with genres we want to ignore ¯\_(ツ)_/¯
      !item.genres?.some((genre) => withoutGenres.includes(genre.id)) &&
      // Note: bloody annoying show that keeps popping up  ¯\_(ツ)_/¯
      item.id !== 131835,
  );
}

export async function fetchPopularTvSeriesByYear(year: number | string) {
  const withoutGenres = [...GLOBAL_GENRES_TO_IGNORE, 16, 10762, 10764, 10766];
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const firstPage = await fetchDiscoverTvSeries({
    without_genres: withoutGenres.join(','),
    // Note: maybe we should use `air_date` instead of `first_air_date`?
    'first_air_date.gte': startDate,
    'first_air_date.lte': endDate,
    'vote_count.gte': 200,
    sort_by: 'vote_average.desc',
    page: 1,
  });

  // If total pages is 3, we need 2 more pages (numberOfPagesToFetch = 2)
  const numberOfPagesToFetch = Math.min(firstPage.totalNumberOfPages - 1, 2);

  // Pages 2-5 (or fewer)
  const additionalPages =
    numberOfPagesToFetch > 0
      ? await Promise.all(
          Array.from({ length: numberOfPagesToFetch }, (_, i) =>
            fetchDiscoverTvSeries({
              without_genres: withoutGenres.join(','),
              'first_air_date.gte': startDate,
              'first_air_date.lte': endDate,
              'vote_count.gte': 200,
              sort_by: 'vote_average.desc',
              page: i + 2, // This gives us pages 2,3,4,5
            }),
          ),
        )
      : [];

  const uniqueItems = Array.from(
    new Map(
      [firstPage, ...additionalPages]
        .flatMap((page) => page.items)
        .map((item) => [item.id, item]),
    ).values(),
  );

  return uniqueItems.filter(
    (item) =>
      !!item.posterImage &&
      !!item.backdropImage &&
      !item.genres?.some((genre) => withoutGenres.includes(genre.id)),
  );
}

export async function fetchGenresForTvSeries() {
  const genresResponse =
    ((await tmdbFetch('/3/genre/tv/list')) as TmdbGenresForTvSeries) ?? [];
  const genres = (genresResponse.genres ?? []).filter(
    (genre) => !GLOBAL_GENRES_TO_IGNORE.includes(genre.id),
  ) as Genre[];

  return genres;
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
  const tvSeriesResponse =
    ((await tmdbFetch(
      `/3/search/tv?${params.toString()}`,
    )) as TmdbSearchTvSeries) ?? [];

  return (tvSeriesResponse.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => {
      return normalizeTvSeries(series as TmdbTvSeries);
    });
}

export async function fetchKoreasFinestTvSeries() {
  const ids = await fetchKoreasFinest();
  const series = await Promise.all(
    ids.map(async (id) => {
      const serie = await fetchTvSeries(id);
      return serie as TvSeries;
    }),
  );
  return series;
}

export async function fetchMostPopularTvSeriesThisMonth() {
  const ids = await fetchMostPopularThisMonth();
  const series = await Promise.all(
    ids.map(async (id) => {
      const serie = await fetchTvSeries(id);
      return serie as TvSeries;
    }),
  );
  return series;
}

export async function fetchWatchProviders(
  region = 'US',
): Promise<WatchProvider[]> {
  const watchProviders = (await tmdbFetch(
    `/3/watch/providers/tv?watch_region=${region}`,
  )) as TmdbWatchProviders;

  return (watchProviders.results ?? [])
    .sort((a, b) => {
      const sortKey = region as keyof typeof watchProviders.results;
      const priorityA = a.display_priorities?.[sortKey] ?? a.display_priority;
      const priorityB = b.display_priorities?.[sortKey] ?? b.display_priority;
      return priorityA - priorityB;
    })
    .map((provider) => ({
      id: provider.provider_id,
      name: provider.provider_name as string,
      logo: provider.logo_path
        ? generateTmdbImageUrl(provider.logo_path, 'w92')
        : '',
      logoPath: provider.logo_path!,
    }));
}

export async function fetchCountries() {
  const response =
    ((await tmdbFetch('/3/configuration/countries')) as TmdbCountries) ?? [];

  return (response ?? [])
    .map((country) => {
      return {
        code: String(country.iso_3166_1),
        englishName: String(country.english_name),
        name: String(country.native_name),
      } as CountryOrLanguage;
    })
    .sort((a, b) => {
      const key = a.englishName && b.englishName ? 'englishName' : 'name';
      return a[key].localeCompare(b[key]);
    });
}

export async function fetchLanguages() {
  const response =
    ((await tmdbFetch('/3/configuration/languages')) as TmdbLanguages) ?? [];

  return (response ?? [])
    .map((language) => {
      return {
        code: String(language.iso_639_1),
        englishName: String(language.english_name),
        name: String(language.name),
      } as CountryOrLanguage;
    })
    .sort((a, b) => {
      const key = a.englishName && b.englishName ? 'englishName' : 'name';
      return a[key].localeCompare(b[key]);
    });
}

export async function fetchKeyword(id: number | string) {
  const response = (await tmdbFetch(`/3/keyword/${id}`)) as TmdbKeyword;
  return response as Keyword | undefined;
}

export async function searchKeywords(query: string) {
  const response =
    ((await tmdbFetch(`/3/search/keyword?query=${query}`)) as TmdbKeywords) ??
    [];

  return (response.results ?? []).map((keyword) => {
    return {
      id: keyword.id,
      name: keyword.name,
    } as Keyword;
  });
}

export async function searchPerson(query: string) {
  const response =
    ((await tmdbFetch(
      `/3/search/person?query=${query}`,
    )) as TmdbSearchPerson) ?? [];

  return (response.results ?? []).map((person) => {
    return {
      id: person.id,
      name: person.name ?? '',
      image: person.profile_path
        ? generateTmdbImageUrl(person.profile_path, 'w600_and_h900_bestv2')
        : '',
      slug: slugify(person.name as string, { lower: true, strict: true }),
      knownForDepartment: person.known_for_department,
      isAdult: person.adult,
      knownFor: (person.known_for ?? []).map((item) => {
        if (item.media_type === 'tv') {
          return normalizeTvSeries(item as unknown as TmdbTvSeries) as TvSeries;
        } else {
          return normalizeMovie(item as TmdbMovie) as Movie;
        }
      }) as ReadonlyArray<TvSeries | Movie>,
    };
  });
}

export async function fetchPerson(id: number | string) {
  const person = (await tmdbFetch(`/3/person/${id}`)) as TmdbPerson;

  return {
    id: person.id,
    age: person.birthday
      ? calculateAge(
          person.birthday,
          person.deathday as (typeof person)['birthday'],
        )
      : undefined,
    name: person.name ?? '',
    image: person.profile_path
      ? generateTmdbImageUrl(person.profile_path, 'w600_and_h900_bestv2')
      : '',
    slug: slugify(person.name as string, { lower: true, strict: true }),
    numberOfEpisodes:
      'total_episode_count' in person ? person.total_episode_count : 0,
    birthdate: person.birthday,
    deathdate: person.deathday,
    placeOfBirth: person.place_of_birth,
    biography: person.biography,
    imdbId: person.imdb_id,
    knownForDepartment: person.known_for_department,
    isAdult: person.adult,
  } as Person;
}

export async function fetchPersonKnownFor(
  person: Person,
): Promise<ReadonlyArray<TvSeries | Movie>> {
  const results = await searchPerson(person.name);
  return results[0]?.knownFor.filter((item) => !!item.posterImage) ?? [];
}

export async function fetchPersonTvCredits(id: number | string) {
  const credits = (await tmdbFetch(
    `/3/person/${id}/tv_credits`,
  )) as TmdbPersonTvCredits;

  const sortAndGroup = (
    results: TmdbPersonTvCredits['cast'] | TmdbPersonTvCredits['crew'] = [],
  ) => {
    const currentDate = new Date();
    const uniqueResults = [
      ...new Map(results.map((item) => [item.id, item])).values(),
    ];
    const normalizedResults = uniqueResults
      .filter(
        (series) =>
          series.poster_path &&
          series.genre_ids &&
          series.genre_ids.length > 0 &&
          !series.genre_ids.some((genre) =>
            GLOBAL_GENRES_TO_IGNORE.includes(genre),
          ),
      )
      .sort((a, b) => {
        if (!a.first_air_date && !b.first_air_date) return 0;
        if (!a.first_air_date) return -1;
        if (!b.first_air_date) return 1;

        const dateA = new Date(a.first_air_date as string);
        const dateB = new Date(b.first_air_date as string);
        return dateB.getTime() - dateA.getTime();
      })
      .map((series) => normalizeTvSeries(series as unknown as TmdbTvSeries));

    const upcoming = normalizedResults.filter((series) => {
      if (!series.firstAirDate) return true;
      return new Date(series.firstAirDate) > currentDate;
    });
    const previous = normalizedResults.filter((series) => {
      if (!series.firstAirDate) return false;
      return new Date(series.firstAirDate) <= currentDate;
    });

    return { upcoming, previous };
  };

  const cast = sortAndGroup(credits.cast);
  const crew = sortAndGroup(credits.crew);

  return { cast, crew };
}

export async function findByExternalId({
  externalId,
  externalSource,
}: Readonly<{
  externalId: string;
  externalSource: TmdbExternalSource;
}>) {
  const response = (await tmdbFetch(
    `/3/find/${externalId}?external_source=${externalSource}`,
  )) as TmdbFindByIdResults;

  const tvSeries = (response.tv_results ?? []).map((series) => {
    return normalizeTvSeries(series as TmdbTvSeries);
  });
  const episodes = (response.tv_episode_results ?? []).map((episode) => {
    return {
      ...normalizeTvSeriesEpisode(episode as TmdbTvSeriesEpisode),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tvSeriesId: (episode as any).show_id,
    };
  });
  const seasons = (response.tv_season_results ?? []).map((_season) => {
    const season = _season as TmdbTvSeriesSeason;
    return {
      id: season.id,
      title: season.name as string,
      description: season.overview ?? '',
      airDate: season.air_date ? new Date(season.air_date).toISOString() : '',
      seasonNumber: season.season_number,
      numberOfEpisodes: episodes.length,
      episodes: [],
    };
  });

  return {
    tvSeries,
    seasons,
    episodes,
  };
}
