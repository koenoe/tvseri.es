import type { BetterFetchOption } from '@better-fetch/fetch';
import { CACHE_LIFE, WATCH_PROVIDER_PRIORITY } from '@tvseri.es/constants';
import type {
  CountryOrLanguage,
  CrewCredit,
  Episode,
  EpisodePerson,
  EpisodeStill,
  EpisodeWithCredits,
  Genre,
  Keyword,
  Movie,
  Network,
  Person,
  PreferredImages,
  Season,
  SeriesImages,
  SeriesRuntimes,
  TmdbCountries,
  TmdbDiscoverTvSeries,
  TmdbDiscoverTvSeriesQuery,
  TmdbExternalSource,
  TmdbFindByIdResults,
  TmdbGenresForTvSeries,
  TmdbLanguages,
  TmdbMovie,
  TmdbNetwork,
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
  TmdbTvSeriesWatchProviders,
  TmdbWatchProviders,
  TvSeries,
  WatchProvider,
} from '@tvseri.es/schemas';
import {
  buildBackdropImageUrl,
  buildPosterImageUrl,
  buildProfileImageUrl,
  buildTitleTreatmentImageUrl,
  chunk,
  toQueryString,
  toSlug,
} from '@tvseri.es/utils';
import { Resource } from 'sst';
import { readThrough } from '@/lib/db/cache/readThrough';
import { readThroughStale } from '@/lib/db/cache/readThroughStale';
import { refreshWaitMs } from '@/lib/deadline';
import { createInstrumentedFetch } from '@/lib/metrics';
import type { TmdbAggregateCredits } from '@/lib/person/collaborators';
import {
  PERSON_FRESH,
  PERSON_KEEP,
  REFRESH_CLAIM_SECONDS,
  UNKNOWN_PERSON_FRESH,
} from '@/lib/person/lifetime';
import type { TmdbPersonExternalIds } from '@/lib/person/links';
import type { PersonTvCredits } from '@/lib/person/shows';
import { upstreamBaseUrl } from '@/lib/upstream/baseUrl';
import { breakerFor } from '@/lib/upstream/breaker';
import { budgetFor, TMDB_CONCURRENCY } from '@/lib/upstream/budget';
import { toWatchProvider } from '@/lib/watchProviders';
import calculateAge from '@/utils/calculateAge';
import { dedupe } from '@/utils/dedupe';
import { createLimiter, mapSettled } from '@/utils/limit';
import { logWarn } from '@/utils/logWarn';
import {
  findPreferredImages,
  findPreferredImagesForMany,
} from '../db/preferredImages';
import detectDominantColorFromImage, {
  detectDominantColorsFromImages,
} from '../detectDominantColorFromImage';
import { detectLogoSilhouette } from '../detectLogoSilhouette';
import {
  fetchImdbTopRatedTvSeries,
  fetchMostPopularThisMonth,
  fetchTrending,
} from '../mdblist';
import {
  buildDiscoverQuery,
  type CreatedShow,
  createdShowsOf,
  deduplicateDiscoverItems,
  GLOBAL_GENRES_TO_IGNORE,
  logoAspectRatio,
  normalizeAggregateCrew,
  normalizeMovie,
  normalizeNetwork,
  normalizePersons,
  normalizeTvSeries,
  normalizeTvSeriesEpisode,
  pickAutomaticImages,
  pickCreatorOf,
  type TmdbCastCredits,
  topCastNames,
} from './helpers';

/**
 * Read on first request, not at import: Lambdas that reach this module only
 * through a shared import and never call TMDB (account deletion) then don't
 * need the TMDB links.
 */
const credentials = () => {
  const apiKey = Resource.TmdbApiKey.value;
  const accessToken = Resource.TmdbApiAccessToken.value;
  if (!apiKey || !accessToken) {
    throw new Error('No "API_KEY" found for TMDb');
  }
  return { accessToken, apiKey };
};

/**
 * Every TMDB request goes through the instance's TMDB budget (calls in
 * flight and started per second, per kind of Lambda: lib/upstream/budget.ts)
 * and the TMDB circuit breaker (lib/upstream/breaker.ts), inside the
 * instrumented fetch. Both live as long as the Lambda instance, not the
 * request: an instance serves one request at a time, but work a timed-out
 * request left running resumes in the next invocation and still holds its
 * slots (as its `dedupe` entries do).
 */
const $fetch = createInstrumentedFetch(
  'tmdb',
  { baseURL: upstreamBaseUrl('TMDB', 'https://api.themoviedb.org') },
  { breaker: breakerFor('tmdb'), budget: budgetFor('tmdb'), retries: 1 },
);

/** A TMDB watch provider (a show's offer or the region's list) as served */
const fromTmdbProvider = (
  provider: Readonly<{
    logo_path?: string;
    provider_id: number;
    provider_name?: string;
  }>,
): WatchProvider =>
  toWatchProvider({
    id: provider.provider_id,
    logoPath: provider.logo_path!,
    name: provider.provider_name as string,
  });

async function tmdbFetch(path: string, options?: BetterFetchOption) {
  // Dedupe concurrent requests to the same path within a Lambda invocation
  const cacheKey = `${path}${options?.query ? JSON.stringify(options.query) : ''}`;

  return dedupe(cacheKey, async () => {
    const { accessToken, apiKey } = credentials();
    const headers = {
      'content-type': 'application/json',
      ...(path.startsWith('/4/') && {
        Authorization: `Bearer ${accessToken}`,
      }),
    };

    const { data, error } = await $fetch(path, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
      query: {
        ...options?.query,
        ...(path.startsWith('/3/') && {
          api_key: apiKey,
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
  });
}

const fetchRawTvSeries = async (
  id: number | string,
  includeImages = false,
  includeCredits = false,
): Promise<(TmdbTvSeries & { credits?: TmdbCastCredits }) | undefined> => {
  // One request: the external ids (IMDb), and the cast when asked, ride
  // along with the show
  const series = (await tmdbFetch(`/3/tv/${id}`, {
    query: {
      append_to_response: includeCredits
        ? 'external_ids,credits'
        : 'external_ids',
    },
  })) as (TmdbTvSeries & { credits?: TmdbCastCredits }) | undefined;

  if (!series || !includeImages) {
    return series;
  }

  const images = (await tmdbFetch(`/3/tv/${series.id}/images`, {
    query: {
      include_image_language: `en,null,${series.original_language ?? ''}`,
    },
  })) as TmdbTvSeriesImages | undefined;

  return images ? { ...series, images } : series;
};

/** The raw TMDB details of a show (with external ids), undefined when unknown */
export const fetchRawTvSeriesDetails = (id: number | string) =>
  fetchRawTvSeries(id);

/**
 * The show, its keywords and its recommendations in one TMDB call
 * (append_to_response), for the home picks.
 */
export async function fetchTvSeriesForPicks(id: number | string) {
  const response = (await tmdbFetch(`/3/tv/${id}`, {
    query: { append_to_response: 'keywords,recommendations' },
  })) as
    | (TmdbTvSeries & {
        keywords?: Readonly<{ results?: ReadonlyArray<Keyword> }>;
        recommendations?: TmdbTvSeriesRecommendations;
      })
    | undefined;

  if (!response) {
    return undefined;
  }

  return {
    keywords: (response.keywords?.results ?? []).map((keyword) => ({
      id: keyword.id,
      name: String(keyword.name),
    })) as ReadonlyArray<Keyword>,
    recommendations: (response.recommendations?.results ?? [])
      .filter((item) => !!item.poster_path)
      .map((item) => normalizeTvSeries(item as TmdbTvSeries)),
    series: normalizeTvSeries(response),
  };
}

/**
 * TMDB data only: no preferred images and no dominant colour lookups. For
 * where `backdropColor` and preferred images aren't rendered (stats,
 * mutations): it saves 1-2 DynamoDB reads and possibly a Lambda invoke.
 */
export async function fetchTvSeriesBase(
  id: number | string,
): Promise<TvSeries | undefined> {
  const series = await fetchRawTvSeries(id);
  return series ? normalizeTvSeries(series) : undefined;
}

/**
 * A show with its artwork: TMDB's text-free backdrop and logo, or the ones
 * an admin picked (a picked text title drops the logo). No dominant colour:
 * for cards that draw none. One images call and one preferred-images read
 * on top of `fetchTvSeriesBase`.
 */
export async function fetchTvSeriesArtwork(
  id: number,
): Promise<TvSeries | undefined> {
  const [series, preferredImages] = await Promise.all([
    fetchRawTvSeries(id, true),
    findPreferredImages(id),
  ]);
  return series
    ? withPreferredImages(
        normalizeTvSeries(series),
        preferredImages,
        undefined,
        series.images,
      )
    : undefined;
}

/**
 * Applies the preferred backdrop (and title treatment) when the series has
 * one; otherwise the backdrop's dominant colour, when it was detected.
 * `images`: the show's TMDB images, where a picked logo's aspect ratio is.
 */
const withPreferredImages = (
  tvSeries: TvSeries,
  preferredImages: PreferredImages | null | undefined,
  backdropColor: string | undefined,
  images: TmdbTvSeries['images'],
): TvSeries => {
  if (preferredImages?.backdropImagePath) {
    const { titleTreatmentImagePath } = preferredImages;
    return {
      ...tvSeries,
      backdropColor: preferredImages.backdropColor,
      backdropImage: buildBackdropImageUrl(preferredImages.backdropImagePath),
      ...(titleTreatmentImagePath && {
        titleTreatmentAspectRatio: logoAspectRatio(
          images,
          titleTreatmentImagePath,
        ),
        titleTreatmentImage: buildTitleTreatmentImageUrl(
          titleTreatmentImagePath,
        ),
      }),
      // The text title: the show's name in the display type, no logo
      ...(preferredImages.titleTreatment === 'text' && {
        titleTreatmentAspectRatio: undefined,
        titleTreatmentImage: undefined,
      }),
    };
  }

  if (tvSeries.backdropPath) {
    return {
      ...tvSeries,
      backdropColor: backdropColor ?? tvSeries.backdropColor,
    };
  }

  return tvSeries;
};

/** The network's logo check (see `detectLogoSilhouette`), when it has an answer */
const withLogoSilhouette = (
  tvSeries: TvSeries,
  logoSilhouette: boolean | undefined,
): TvSeries =>
  tvSeries.network && logoSilhouette !== undefined
    ? { ...tvSeries, network: { ...tvSeries.network, logoSilhouette } }
    : tvSeries;

// The dominant colour is only detected for a backdrop without a preferred one
const needsBackdropColor = (
  tvSeries: TvSeries,
  preferredImages: PreferredImages | null | undefined,
) => !preferredImages?.backdropImagePath && !!tvSeries.backdropPath;

export async function fetchTvSeries(
  id: number | string,
  options: Readonly<{ includeImages?: boolean }> = { includeImages: false },
): Promise<TvSeries | undefined> {
  const [series, preferredImages] = await Promise.all([
    fetchRawTvSeries(id, options.includeImages),
    findPreferredImages(Number(id)),
  ]);

  if (!series) {
    return undefined;
  }

  const normalizedTvSeries = normalizeTvSeries(series);
  const networkLogoPath = series.networks?.[0]?.logo_path;

  const [backdropColor, logoSilhouette] = await Promise.all([
    needsBackdropColor(normalizedTvSeries, preferredImages)
      ? detectDominantColorFromImage({
          path: normalizedTvSeries.backdropPath!,
          size: 'w780',
        })
      : undefined,
    networkLogoPath ? detectLogoSilhouette(networkLogoPath) : undefined,
  ]);

  return withPreferredImages(
    withLogoSilhouette(normalizedTvSeries, logoSilhouette),
    preferredImages,
    backdropColor,
    series.images,
  );
}

/**
 * `fetchTvSeries` (with images) for a list: the preferred images and the
 * dominant colours are read in one batch each instead of per series. Series
 * that don't exist are dropped; see mapSettled for failures. Each also gets
 * its top three cast (`topCast`, from the same TMDB call) for the
 * spotlight's hook line.
 */
async function fetchTvSeriesListWithImages(ids: ReadonlyArray<number>) {
  const [fetched, preferredImagesById] = await Promise.all([
    mapSettled(
      ids,
      async (id) => {
        const series = await fetchRawTvSeries(id, true, true);
        return (
          series && {
            images: series.images,
            series: {
              ...normalizeTvSeries(series),
              topCast: topCastNames(series.credits),
            } satisfies TvSeries,
          }
        );
      },
      TMDB_CONCURRENCY,
    ),
    // Best-effort: without them the series keep their TMDB backdrops
    findPreferredImagesForMany(ids).catch((error: unknown) => {
      logWarn(
        'Batched preferred images read failed, continuing without them',
        error,
      );
      return new Map<number, PreferredImages>();
    }),
  ]);

  const seriesList = fetched.map(({ series }) => series);
  // Best-effort: without them the series keep their default backdrop colour
  const backdropColors = await detectDominantColorsFromImages({
    paths: seriesList
      .filter((tvSeries) =>
        needsBackdropColor(tvSeries, preferredImagesById.get(tvSeries.id)),
      )
      .map((tvSeries) => tvSeries.backdropPath!),
    size: 'w780',
  }).catch((error: unknown) => {
    logWarn(
      'Batched dominant colours read failed, continuing without them',
      error,
    );
    return new Map<string, string>();
  });

  return fetched.map(({ images, series: tvSeries }) =>
    withPreferredImages(
      tvSeries,
      preferredImagesById.get(tvSeries.id),
      tvSeries.backdropPath
        ? backdropColors.get(tvSeries.backdropPath)
        : undefined,
      images,
    ),
  );
}

/**
 * Fetches a poster list with bounded concurrency. Series that don't exist (or
 * an odd failure) are dropped; more than 10% failures throw (see mapSettled).
 * Posters don't need preferred images or the dominant colour, so this skips
 * both lookups.
 */
const fetchTvSeriesPosterList = (ids: ReadonlyArray<number>) =>
  mapSettled(ids, (id) => fetchTvSeriesBase(id), TMDB_CONCURRENCY);

/**
 * A show's images on TMDB: text-free backdrops and every logo in TMDB's vote
 * order (logos with size and language), and the images the series object
 * uses when no admin pick is saved (`automatic`).
 */
export async function fetchTvSeriesImages(
  id: number | string,
  originalLanguage?: string,
): Promise<Omit<SeriesImages, 'preferred'> | undefined> {
  const response = (await tmdbFetch(`/3/tv/${id}/images`, {
    query: {
      include_image_language: `en,null,${originalLanguage ?? ''}`,
    },
  })) as TmdbTvSeriesImages | undefined;

  if (!response) {
    return undefined;
  }

  const byVotes = (
    a: Readonly<{ vote_average?: number }>,
    b: Readonly<{ vote_average?: number }>,
  ) => (b.vote_average ?? 0) - (a.vote_average ?? 0);

  return {
    automatic: pickAutomaticImages(response),
    backdrops: (response.backdrops ?? [])
      .filter((backdrop) => !!backdrop.file_path && backdrop.iso_639_1 === null)
      .sort(byVotes)
      .map((backdrop) => ({
        path: backdrop.file_path!,
        url: buildBackdropImageUrl(backdrop.file_path!),
      })),
    titleTreatment: (response.logos ?? [])
      .filter((logo) => !!logo.file_path)
      .sort(byVotes)
      .map((logo) => ({
        height: logo.height ?? 0,
        language: typeof logo.iso_639_1 === 'string' ? logo.iso_639_1 : null,
        path: logo.file_path!,
        url: buildTitleTreatmentImageUrl(logo.file_path!),
        width: logo.width ?? 0,
      })),
  };
}

/**
 * The admin image picker's choices: `fetchTvSeriesImages` plus the saved pick
 * (without its key and bookkeeping), so the strips can mark it.
 */
export async function fetchTvSeriesImageChoices(
  id: number | string,
  originalLanguage?: string,
): Promise<SeriesImages | undefined> {
  const [images, preferred] = await Promise.all([
    fetchTvSeriesImages(id, originalLanguage),
    findPreferredImages(Number(id)),
  ]);

  return (
    images && {
      ...images,
      preferred: preferred && {
        backdropColor: preferred.backdropColor,
        backdropImagePath: preferred.backdropImagePath,
        ...(preferred.titleTreatment === 'text' && {
          titleTreatment: preferred.titleTreatment,
        }),
        ...(preferred.titleTreatmentImagePath && {
          titleTreatmentImagePath: preferred.titleTreatmentImagePath,
        }),
      },
    }
  );
}

export async function fetchTvSeriesContentRating(
  id: number | string,
  region = 'US',
): Promise<string | undefined | null> {
  const contentRatings = (await tmdbFetch(`/3/tv/${id}/content_ratings`)) as
    | TmdbTvSeriesContentRatings
    | undefined;

  const contentRating =
    contentRatings?.results?.find((rating) => rating.iso_3166_1 === region)
      ?.rating ?? null;

  return contentRating;
}

type RegionProviders = NonNullable<
  TmdbTvSeriesWatchProviders['results']
>[keyof NonNullable<TmdbTvSeriesWatchProviders['results']>];

/**
 * A show's where-to-watch for every region, as TMDB gives it (only the
 * flat-rate, free and ad-supported offers we show), stored per show for a
 * day: the same for every viewer, so the profile's tickets, the
 * single-episode mark and the show page share one TMDB call per show a day.
 */
const watchProvidersOf = (id: number | string) =>
  readThroughStale<TmdbTvSeriesWatchProviders | null>(
    `tmdb-watch-providers:v3:${id}`,
    CACHE_LIFE.short.sMaxAge,
    // Kept a week to stand in; with a stored copy, a read waits on the
    // (low-priority) refresh only for what is left of its refresh wait
    7 * 24 * 60 * 60,
    async () => {
      const response = (await tmdbFetch(`/3/tv/${id}/watch/providers`)) as
        | TmdbTvSeriesWatchProviders
        | undefined;
      if (!response) {
        return null;
      }
      const results = Object.fromEntries(
        Object.entries(response.results ?? {}).map(([region, offers]) => {
          const { ads, flatrate, free } = (offers ?? {}) as RegionProviders &
            Readonly<{ ads?: unknown; free?: unknown }>;
          return [region, { ads, flatrate, free }];
        }),
      );
      return { ...response, results } as TmdbTvSeriesWatchProviders;
    },
    { lowPriority: true, waitMs: refreshWaitMs },
  );

export async function fetchTvSeriesWatchProviders(
  id: number | string,
  region = 'US',
): Promise<WatchProvider[]> {
  const watchProviders = (await watchProvidersOf(id)) ?? undefined;

  const regionProviders =
    watchProviders?.results?.[
      region as keyof NonNullable<TmdbTvSeriesWatchProviders['results']>
    ];
  const flatrate = regionProviders?.flatrate ?? [];
  // Free and ad-supported services are shown like subscription ones
  const offersOf = (kind: 'ads' | 'free') => {
    const offers = (regionProviders as Record<string, unknown> | undefined)?.[
      kind
    ];
    return Array.isArray(offers) ? (offers as typeof flatrate) : [];
  };
  const providers = [...offersOf('free'), ...offersOf('ads'), ...flatrate];

  return providers
    .sort((a, b) => {
      const aPriority =
        WATCH_PROVIDER_PRIORITY[a.provider_name!] ?? a.display_priority ?? 0;
      const bPriority =
        WATCH_PROVIDER_PRIORITY[b.provider_name!] ?? b.display_priority ?? 0;
      return aPriority - bPriority;
    })
    .map(fromTmdbProvider);
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
): Promise<Readonly<{ cast: Person[]; crew: CrewCredit[] }>> {
  const credits = (await tmdbFetch(`/3/tv/${id}/aggregate_credits`)) as
    | TmdbTvSeriesCredits
    | undefined;

  if (!credits?.cast) {
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
    crew: normalizeAggregateCrew(credits.crew),
  };
}

export async function fetchTvSeriesRecommendations(
  id: number | string,
): Promise<TvSeries[]> {
  const response = (await tmdbFetch(`/3/tv/${id}/recommendations`)) as
    | TmdbTvSeriesRecommendations
    | undefined;

  return (response?.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => {
      return normalizeTvSeries(series as TmdbTvSeries);
    });
}

/**
 * What's needed to pick a Latin-script title: the original name, the origin
 * countries and the alternative titles, in one request.
 */
export async function fetchTvSeriesTitles(id: number | string) {
  const response = (await tmdbFetch(`/3/tv/${id}`, {
    query: { append_to_response: 'alternative_titles' },
  })) as
    | Readonly<{
        alternative_titles?: Readonly<{
          results?: ReadonlyArray<
            Readonly<{ iso_3166_1: string; title: string; type: string }>
          >;
        }>;
        origin_country?: ReadonlyArray<string>;
        original_name?: string;
      }>
    | undefined;

  return response
    ? {
        alternativeTitles: response.alternative_titles?.results ?? [],
        originalName: response.original_name ?? '',
        originCountry: response.origin_country ?? [],
      }
    : undefined;
}

export async function fetchTvSeriesKeywords(
  id: number | string,
): Promise<Keyword[] | undefined> {
  const response = (await tmdbFetch(`/3/tv/${id}/keywords`)) as
    | TmdbTvSeriesKeywords
    | undefined;

  return response?.results?.map((keyword) => ({
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
    // No season air_date: the earliest aired episode's date
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

/** TMDB answers at most 20 appended sub-requests per call. */
const APPEND_LIMIT = 20;

type TmdbRuntimeEpisode = Readonly<{
  episode_number: number;
  runtime?: number | null;
}>;

/**
 * Every regular season's episode runtimes in minutes (0 where TMDB has
 * none), by season number, index = episode number − 1: the show page's time
 * left and runtime range. One `/tv/:id` call per 20 seasons
 * (`append_to_response=season/1,…`) instead of a request per season.
 * Specials (season 0) are left out. Undefined for an unknown show.
 */
export async function fetchTvSeriesRuntimes(
  id: number | string,
  /** The regular season numbers when the caller knows them (no details call) */
  seasonNumbers?: ReadonlyArray<number>,
): Promise<SeriesRuntimes | undefined> {
  let numbers = seasonNumbers?.filter((number) => number > 0);
  if (!numbers) {
    const series = await fetchRawTvSeries(id);
    if (!series) {
      return undefined;
    }
    numbers = (series.seasons ?? [])
      .map((season) => season.season_number)
      .filter((number) => number > 0);
  }
  const all = numbers;
  const chunks = chunk(all, APPEND_LIMIT);
  const pages = await Promise.all(
    chunks.map(
      (seasonNumbers) =>
        tmdbFetch(`/3/tv/${id}`, {
          query: {
            append_to_response: seasonNumbers
              .map((number) => `season/${number}`)
              .join(','),
          },
        }) as Promise<Record<string, unknown> | undefined>,
    ),
  );
  const runtimes: Record<number, number[]> = {};
  for (const [index, seasonNumbers] of chunks.entries()) {
    for (const number of seasonNumbers) {
      const season = pages[index]?.[`season/${number}`] as
        | Readonly<{ episodes?: ReadonlyArray<TmdbRuntimeEpisode> }>
        | undefined;
      const episodes = season?.episodes ?? [];
      const length = Math.max(
        0,
        ...episodes.map((episode) => episode.episode_number),
      );
      const minutes = Array.from({ length }, () => 0);
      for (const episode of episodes) {
        if (episode.episode_number > 0) {
          minutes[episode.episode_number - 1] = episode.runtime ?? 0;
        }
      }
      runtimes[number] = minutes;
    }
  }
  return runtimes;
}

type TmdbEpisodePerson = Readonly<{
  character?: string;
  id: number;
  job?: string;
  name?: string;
  profile_path?: string | null;
}>;

const normalizeEpisodePeople = (
  people: ReadonlyArray<TmdbEpisodePerson> | undefined,
): ReadonlyArray<EpisodePerson> =>
  (people ?? []).map((person) => ({
    character: person.character ?? '',
    id: person.id,
    image: person.profile_path
      ? buildProfileImageUrl(person.profile_path, 'w138_and_h175_face')
      : '',
    job: person.job ?? '',
    name: person.name ?? '',
  }));

/** A season's poster (the season details carry it; the Season type doesn't) */
export async function fetchTvSeriesSeasonPoster(
  id: number | string,
  season: number | string,
): Promise<string | undefined> {
  const response = (await tmdbFetch(`/3/tv/${id}/season/${season}`)) as
    | TmdbTvSeriesSeason
    | undefined;

  return response?.poster_path
    ? buildPosterImageUrl(response.poster_path)
    : undefined;
}

type TmdbStill = Readonly<{
  aspect_ratio: number;
  file_path: string;
  height: number;
  vote_average: number;
  vote_count: number;
  width: number;
}>;

/** The stills (episode images) TMDB has for one episode, with size and votes */
export async function fetchTvSeriesEpisodeStills(
  id: number | string,
  season: number | string,
  episode: number | string,
): Promise<ReadonlyArray<EpisodeStill>> {
  const response = (await tmdbFetch(
    `/3/tv/${id}/season/${season}/episode/${episode}/images`,
  )) as Readonly<{ stills?: ReadonlyArray<TmdbStill> }> | undefined;

  return (response?.stills ?? []).map((still) => ({
    aspectRatio: still.aspect_ratio,
    height: still.height,
    path: still.file_path,
    voteAverage: still.vote_average,
    voteCount: still.vote_count,
    width: still.width,
  }));
}

export async function fetchTvSeriesEpisode(
  id: number | string,
  season: number | string,
  episode: number | string,
): Promise<Episode | undefined> {
  const response = (await tmdbFetch(
    `/3/tv/${id}/season/${season}/episode/${episode}`,
  )) as TmdbTvSeriesEpisode | undefined;

  return response ? normalizeTvSeriesEpisode(response) : undefined;
}

/** The episode plus its guest stars and crew, in the same TMDB call */
export async function fetchTvSeriesEpisodeWithCredits(
  id: number | string,
  season: number | string,
  episode: number | string,
): Promise<EpisodeWithCredits | undefined> {
  const response = (await tmdbFetch(
    `/3/tv/${id}/season/${season}/episode/${episode}`,
    { query: { append_to_response: 'credits' } },
  )) as
    | (TmdbTvSeriesEpisode & {
        credits?: Readonly<{
          crew?: ReadonlyArray<TmdbEpisodePerson>;
          guest_stars?: ReadonlyArray<TmdbEpisodePerson>;
        }>;
      })
    | undefined;

  if (!response) {
    return undefined;
  }

  return {
    ...normalizeTvSeriesEpisode(response),
    credits: {
      crew: normalizeEpisodePeople(response.credits?.crew),
      guestStars: normalizeEpisodePeople(
        response.credits?.guest_stars ?? response.guest_stars,
      ),
    },
  };
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
  const response = (await tmdbFetch(`/3/discover/tv${queryString}`)) as
    | TmdbDiscoverTvSeries
    | undefined;

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
    page && i + 2 <= firstPage.totalNumberOfPages ? [page] : [],
  );

  return deduplicateDiscoverItems([firstPage, ...additionalPages]).filter(
    (item) =>
      !!item.posterImage &&
      !!item.backdropImage &&
      !item.genres?.some((genre) => withoutGenres.includes(genre.id)),
  );
}

/**
 * TMDB's TV genres, stored for a month (reference data, the same for every
 * viewer: Home's More {genre}, Match, Circle, landings and Where to start)
 */
export async function fetchGenresForTvSeries() {
  const genresResponse =
    (await readThrough<TmdbGenresForTvSeries | null>(
      'tmdb-genres:v1',
      CACHE_LIFE.long.sMaxAge,
      async () =>
        ((await tmdbFetch('/3/genre/tv/list')) as
          | TmdbGenresForTvSeries
          | undefined) ?? null,
    )) ?? {};
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
  const watchProviders = (await tmdbFetch('/3/watch/providers/tv', {
    query: { watch_region: region },
  })) as TmdbWatchProviders | undefined;

  return (watchProviders?.results ?? [])
    .sort((a, b) => {
      const sortKey = region as keyof TmdbWatchProviders['results'];
      const priorityA = a.display_priorities?.[sortKey] ?? a.display_priority;
      const priorityB = b.display_priorities?.[sortKey] ?? b.display_priority;
      return priorityA - priorityB;
    })
    .map(fromTmdbProvider);
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

/**
 * A network's TMDB facts (its logo, country), stored for a month (reference
 * data that rarely changes: the network page and What's on's caption read it
 * every day, TMDB is asked once a month per network), and whether its logo
 * reads as a white silhouette (checked once per logo, stored for good)
 */
export async function fetchNetwork(
  id: number | string,
): Promise<Network | undefined> {
  const response = await readThrough<TmdbNetwork | null>(
    `tmdb-network:v1:${id}`,
    (value) => (value ? CACHE_LIFE.long.sMaxAge : false),
    async () =>
      ((await tmdbFetch(`/3/network/${id}`)) as TmdbNetwork | undefined) ??
      null,
  );
  if (!response) {
    return undefined;
  }
  const network = normalizeNetwork(response);
  const logoSilhouette = response.logo_path
    ? await detectLogoSilhouette(response.logo_path)
    : undefined;
  return logoSilhouette === undefined
    ? network
    : { ...network, logoSilhouette };
}

export async function searchPerson(query: string) {
  const response = (await tmdbFetch('/3/search/person', {
    query: { query },
  })) as TmdbSearchPerson | undefined;

  return (response?.results ?? []).map((person) => {
    return {
      id: person.id,
      image: person.profile_path
        ? buildProfileImageUrl(person.profile_path)
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
      popularity: person.popularity ?? 0,
      slug: toSlug(person.name as string),
    };
  });
}

const TMDB_GENDERS: Readonly<Record<number, NonNullable<Person['gender']>>> = {
  1: 'female',
  2: 'male',
  3: 'non-binary',
};

// A person's details are read by several routes of the person page, each in
// its own Lambda: one stored copy (lifetime: lib/person/lifetime.ts)

export async function fetchPerson(id: number | string) {
  const person = await readThroughStale<TmdbPerson | null>(
    `tmdb-person:v2:${id}`,
    (found) => (found ? PERSON_FRESH : UNKNOWN_PERSON_FRESH),
    PERSON_KEEP,
    async () =>
      ((await tmdbFetch(`/3/person/${id}`)) as TmdbPerson | undefined) ?? null,
    { singleFlightSeconds: REFRESH_CLAIM_SECONDS },
  );

  if (!person) {
    return undefined;
  }

  const gender =
    typeof person.gender === 'number' ? TMDB_GENDERS[person.gender] : undefined;

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
    ...(gender && { gender }),
    id: person.id,
    image: person.profile_path ? buildProfileImageUrl(person.profile_path) : '',
    imdbId: person.imdb_id,
    isAdult: person.adult,
    knownForDepartment: person.known_for_department,
    name: person.name ?? '',
    numberOfEpisodes:
      'total_episode_count' in person ? person.total_episode_count : 0,
    placeOfBirth: person.place_of_birth,
    slug: toSlug(person.name as string),
  } as Person;
}

export async function fetchPersonKnownFor(
  person: Person,
): Promise<ReadonlyArray<TvSeries | Movie>> {
  const results = await searchPerson(person.name);
  return results[0]?.knownFor.filter((item) => !!item.posterImage) ?? [];
}

/**
 * `/person/:id/tv_credits` as TMDB answers it: the person page, Go deeper,
 * Connected by and the created-shows lookup each shape it their own way
 */
const fetchRawPersonTvCredits = async (id: number | string) =>
  (await tmdbFetch(`/3/person/${id}/tv_credits`)) as
    | TmdbPersonTvCredits
    | undefined;

export async function fetchPersonTvCredits(id: number | string) {
  const credits = await fetchRawPersonTvCredits(id);

  if (!credits) {
    return undefined;
  }

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

export async function fetchPersonExternalIds(id: number | string) {
  return (await tmdbFetch(`/3/person/${id}/external_ids`)) as
    | TmdbPersonExternalIds
    | undefined;
}

/**
 * A person's TV credits as `/person/:id/tv_credits` gives them, trimmed to
 * what the person page reads (lib/person/load.ts caches them per person);
 * undefined for a person TMDB doesn't know.
 */
export async function fetchPersonCredits(
  id: number | string,
): Promise<PersonTvCredits | undefined> {
  const credits: PersonTvCredits | undefined =
    await fetchRawPersonTvCredits(id);
  if (!credits) {
    return undefined;
  }
  const trim = (list: PersonTvCredits['cast']) =>
    (list ?? []).map((credit) => ({
      character: credit.character,
      episode_count: credit.episode_count,
      first_air_date: credit.first_air_date,
      genre_ids: credit.genre_ids,
      id: credit.id,
      job: credit.job,
      name: credit.name,
      popularity: credit.popularity,
      poster_path: credit.poster_path,
      vote_count: credit.vote_count,
    }));
  return { cast: trim(credits.cast), crew: trim(credits.crew) };
}

/** `/tv/:id/aggregate_credits`: everyone who worked on a show, with counts */
export async function fetchTvSeriesAggregateCredits(id: number) {
  return (await tmdbFetch(`/3/tv/${id}/aggregate_credits`)) as
    | TmdbAggregateCredits
    | undefined;
}

export async function findByExternalId({
  externalId,
  externalSource,
}: Readonly<{
  externalId: string;
  externalSource: TmdbExternalSource;
}>) {
  const response = (await tmdbFetch(
    `/3/find/${encodeURIComponent(externalId)}`,
    { query: { external_source: externalSource } },
  )) as TmdbFindByIdResults | undefined;

  const tvSeries = (response?.tv_results ?? []).map((series) => {
    return normalizeTvSeries(series as TmdbTvSeries);
  });
  const episodes = (response?.tv_episode_results ?? []).map((episode) => {
    return {
      ...normalizeTvSeriesEpisode(episode as TmdbTvSeriesEpisode),
      // biome-ignore lint/suspicious/noExplicitAny: sort out one day
      tvSeriesId: (episode as any).show_id,
    };
  });
  const seasons = (response?.tv_season_results ?? []).map((_season) => {
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
  const series = await fetchTvSeriesListWithImages(await fetchTrending());
  return withCreatorOf(
    series.filter((item) => Boolean(item.posterImage && item.backdropImage)),
  );
}

export async function fetchTopRatedTvSeries() {
  const series = await fetchTvSeriesPosterList(
    await fetchImdbTopRatedTvSeries(),
  );
  return series.filter((serie) => !!serie.posterImage);
}

export async function fetchMostPopularTvSeriesThisMonth() {
  const series = await fetchTvSeriesPosterList(
    await fetchMostPopularThisMonth(),
  );
  return series.filter((serie) => !!serie.posterImage);
}
