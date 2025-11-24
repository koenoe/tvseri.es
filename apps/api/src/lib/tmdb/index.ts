import { type BetterFetchOption, createFetch } from '@better-fetch/fetch';
import {
  DEFAULT_FETCH_RETRY_OPTIONS,
  WATCH_PROVIDER_PRIORITY,
} from '@tvseri.es/constants';
import type {
  Account,
  CountryOrLanguage,
  Episode,
  Genre,
  Keyword,
  Movie,
  Person,
  Season,
  TmdbAccountDetails,
  TmdbCountries,
  TmdbDiscoverTvSeries,
  TmdbDiscoverTvSeriesQuery,
  TmdbExternalSource,
  TmdbFindByIdResults,
  TmdbGenresForTvSeries,
  TmdbKeyword,
  TmdbKeywords,
  TmdbLanguages,
  TmdbMovie,
  TmdbPerson,
  TmdbPersonTvCredits,
  TmdbSearchPerson,
  TmdbSearchTvSeries,
  TmdbTvSeries,
  TmdbTvSeriesContentRatings,
  TmdbTvSeriesCredits,
  TmdbTvSeriesEpisode,
  TmdbTvSeriesImages,
  TmdbTvSeriesKeywords,
  TmdbTvSeriesRecommendations,
  TmdbTvSeriesSeason,
  TmdbTvSeriesSimilar,
  TmdbTvSeriesWatchProviders,
  TmdbWatchProviders,
  TvSeries,
  WatchProvider,
} from '@tvseri.es/schemas';
import { toQueryString } from '@tvseri.es/utils';
import slugify from 'slugify';
import { Resource } from 'sst';
import calculateAge from '@/utils/calculateAge';
import { findPreferredImages } from '../db/preferredImages';
import detectDominantColorFromImage from '../detectDominantColorFromImage';
import {
  fetchBestBritishCrime,
  fetchImdbTopRatedTvSeries,
  fetchKoreasFinest,
  fetchMostAnticipated,
  fetchMostPopularThisMonth,
  fetchTrending,
} from '../mdblist';
import {
  buildBackdropImageUrl,
  buildDiscoverQuery,
  buildTitleTreatmentImageUrl,
  deduplicateDiscoverItems,
  GLOBAL_GENRES_TO_IGNORE,
  generateTmdbImageUrl,
  normalizeMovie,
  normalizePersons,
  normalizeTvSeries,
  normalizeTvSeriesEpisode,
} from './helpers';

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
    body: JSON.stringify({
      redirect_to: redirectUri,
    }),
    method: 'POST',
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
    body: JSON.stringify({
      request_token: requestToken,
    }),
    method: 'POST',
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
      accessToken: null,
      accountObjectId: null,
    };
  }

  return {
    accessToken: response?.access_token,
    accountObjectId: response?.account_id,
  };
}

export async function createSessionId(accessToken: string) {
  const response = (await tmdbFetch('/3/authentication/session/convert/4', {
    body: JSON.stringify({
      access_token: accessToken,
    }),
    method: 'POST',
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
    body: JSON.stringify({
      session_id: sessionId,
    }),
    method: 'DELETE',
  });
}

export async function deleteAccessToken(accessToken: string) {
  await tmdbFetch('/4/auth/access_token', {
    body: JSON.stringify({
      access_token: accessToken,
    }),
    method: 'DELETE',
  });
}

export async function fetchAccountDetails(sessionId: string) {
  const response = (await tmdbFetch(
    `/3/account?session_id=${sessionId}`,
  )) as TmdbAccountDetails;

  return {
    avatar: response.avatar?.gravatar
      ? `https://www.gravatar.com/avatar/${response.avatar.gravatar.hash}`
      : undefined,
    id: response?.id,
    name: response?.name,
    username: response?.username,
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

  if (preferredImages?.backdropImagePath) {
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
    const backdropColor = await detectDominantColorFromImage({
      cacheKey: normalizedTvSeries.backdropPath!,
      url: normalizedTvSeries.backdropImage.replace(
        'w1920_and_h1080_multi_faces',
        'w780',
      ),
    });

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

  const regionProviders =
    watchProviders.results?.[region as keyof typeof watchProviders.results];
  const flatrate = regionProviders?.flatrate ?? [];
  const free =
    (regionProviders &&
    'free' in regionProviders &&
    Array.isArray(regionProviders.free)
      ? (regionProviders.free as typeof flatrate)
      : []) ?? [];

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
      logo: provider.logo_path
        ? generateTmdbImageUrl(provider.logo_path, 'w92')
        : '',
      logoPath: provider.logo_path!,
      name: provider.provider_name as string,
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

  let airDate = '';
  if (response.air_date) {
    airDate = new Date(response.air_date).toISOString();
  } else {
    // If season air_date is null, find the earliest aired episode's date
    const airedEpisodesWithDates = episodes.filter(
      (episode) => episode.hasAired && episode.airDate,
    );
    if (airedEpisodesWithDates.length > 0) {
      const earliestEpisode = airedEpisodesWithDates.reduce(
        (earliest, current) =>
          new Date(current.airDate) < new Date(earliest.airDate)
            ? current
            : earliest,
      );
      airDate = earliestEpisode.airDate;
    }
  }

  return {
    airDate,
    description: response.overview ?? '',
    episodes,
    hasAired: new Date(airDate) <= new Date(),
    id: response.id,
    numberOfAiredEpisodes,
    numberOfEpisodes,
    seasonNumber: response.season_number,
    title: response.name as string,
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
    queryString: query ? toQueryString(query) : '',
    totalNumberOfItems: response.total_results,
    totalNumberOfPages: response.total_pages,
  };
}

export async function fetchBestSportsDocumentariesTvSeries() {
  const { items } = await fetchDiscoverTvSeries({
    sort_by: 'vote_average.desc',
    'vote_count.gte': 7,
    with_genres: '99',
    with_keywords: '6075|2702',
    without_genres: '35',
    without_keywords: '10596,293434,288928,11672',
  });
  return items.filter((item) => !!item.posterImage && !!item.backdropImage);
}

export async function fetchApplePlusTvSeries(region = 'US') {
  const { items } = await fetchDiscoverTvSeries({
    sort_by: 'vote_average.desc',
    'vote_count.gte': 250,
    watch_region: region,
    with_networks: 2552,
    with_watch_providers: '350',
  });
  return items.filter((item) => !!item.posterImage && !!item.backdropImage);
}

export async function fetchNetflixOriginals(region = 'US') {
  const withoutGenres = [...GLOBAL_GENRES_TO_IGNORE, 10764, 16];
  const { items } = await fetchDiscoverTvSeries({
    sort_by: 'vote_average.desc',
    'vote_count.gte': 1000,
    watch_region: region,
    with_networks: 213,
    with_watch_providers: '8',
    without_genres: withoutGenres.join(','),
    without_keywords: '4344|228221',
  });
  return items.filter((item) => !!item.posterImage && !!item.backdropImage);
}

export async function fetchPopularTvSeriesByYear(year: number | string) {
  const withoutGenres = [...GLOBAL_GENRES_TO_IGNORE, 10764, 16];
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const query = {
    // Note: maybe we should use `air_date` instead of `first_air_date`?
    'first_air_date.gte': startDate,
    'first_air_date.lte': endDate,
    sort_by: 'vote_average.desc',
    'vote_count.gte': 250,
    without_genres: withoutGenres.join(','),
  } as const;

  const firstPage = await fetchDiscoverTvSeries({
    ...query,
    page: 1,
  });

  const numberOfPagesToFetch = Math.min(firstPage.totalNumberOfPages - 1, 4);
  const additionalPages =
    numberOfPagesToFetch > 0
      ? await Promise.all(
          Array.from({ length: numberOfPagesToFetch }, (_, i) =>
            fetchDiscoverTvSeries({
              ...query,
              page: i + 2, // Pages 2, 3, 4, 5
            }),
          ),
        )
      : [];

  return deduplicateDiscoverItems([firstPage, ...additionalPages]).filter(
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
      logo: provider.logo_path
        ? generateTmdbImageUrl(provider.logo_path, 'w92')
        : '',
      logoPath: provider.logo_path!,
      name: provider.provider_name as string,
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
      image: person.profile_path
        ? generateTmdbImageUrl(person.profile_path, 'w600_and_h900_bestv2')
        : '',
      isAdult: person.adult,
      knownFor: (person.known_for ?? []).map((item) => {
        if (item.media_type === 'tv') {
          return normalizeTvSeries(item as unknown as TmdbTvSeries) as TvSeries;
        } else {
          return normalizeMovie(item as TmdbMovie) as Movie;
        }
      }) as ReadonlyArray<TvSeries | Movie>,
      knownForDepartment: person.known_for_department,
      name: person.name ?? '',
      slug: slugify(person.name as string, { lower: true, strict: true }),
    };
  });
}

export async function fetchPerson(id: number | string) {
  const person = (await tmdbFetch(`/3/person/${id}`)) as TmdbPerson;

  if (!person) {
    return undefined;
  }

  return {
    age: person.birthday
      ? calculateAge(
          person.birthday,
          person.deathday as (typeof person)['birthday'],
        )
      : undefined,
    biography: person.biography,
    birthdate: person.birthday,
    deathdate: person.deathday,
    id: person.id,
    image: person.profile_path
      ? generateTmdbImageUrl(person.profile_path, 'w600_and_h900_bestv2')
      : '',
    imdbId: person.imdb_id,
    isAdult: person.adult,
    knownForDepartment: person.known_for_department,
    name: person.name ?? '',
    numberOfEpisodes:
      'total_episode_count' in person ? person.total_episode_count : 0,
    placeOfBirth: person.place_of_birth,
    slug: slugify(person.name as string, { lower: true, strict: true }),
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

    return { previous, upcoming };
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
      // biome-ignore lint/suspicious/noExplicitAny: sort out one day
      tvSeriesId: (episode as any).show_id,
    };
  });
  const seasons = (response.tv_season_results ?? []).map((_season) => {
    const season = _season as TmdbTvSeriesSeason;
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

export async function fetchTrendingTvSeries() {
  const trendingIds = await fetchTrending();
  const series = await Promise.all(
    trendingIds.map(async (id) => {
      const serie = await fetchTvSeries(id, {
        includeImages: true,
      });
      return serie as TvSeries;
    }),
  );
  return series.filter((item) =>
    Boolean(item.posterImage && item.backdropImage),
  );
}

export async function fetchTopRatedTvSeries() {
  const topRatedIds = await fetchImdbTopRatedTvSeries();
  const series = await Promise.all(
    topRatedIds.map(async (id) => {
      const serie = await fetchTvSeries(id);
      return serie as TvSeries;
    }),
  );
  return series.filter((serie) => !!serie.posterImage);
}

export async function fetchKoreasFinestTvSeries() {
  const ids = await fetchKoreasFinest();
  const series = await Promise.all(
    ids.map(async (id) => {
      const serie = await fetchTvSeries(id);
      return serie as TvSeries;
    }),
  );
  return series.filter((serie) => !!serie.posterImage);
}

export async function fetchMostPopularTvSeriesThisMonth() {
  const ids = await fetchMostPopularThisMonth();
  const series = await Promise.all(
    ids.map(async (id) => {
      const serie = await fetchTvSeries(id);
      return serie as TvSeries;
    }),
  );
  return series.filter((serie) => !!serie.posterImage);
}

export async function fetchMostAnticipatedTvSeries() {
  const ids = await fetchMostAnticipated();
  const series = await Promise.all(
    ids.map(async (id) => {
      const serie = await fetchTvSeries(id);
      return serie as TvSeries;
    }),
  );
  return series.filter((serie) => !!serie.posterImage);
}

export async function fetchBestBritishCrimeTvSeries() {
  const ids = await fetchBestBritishCrime();
  const series = await Promise.all(
    ids.map(async (id) => {
      const serie = await fetchTvSeries(id);
      return serie as TvSeries;
    }),
  );
  return series.filter((serie) => !!serie.posterImage);
}
