import type {
  Episode,
  Person,
  Rating,
  Season,
  TvSeries,
  User,
  WatchProvider,
} from '@tvseri.es/schemas';

import { apiFetch } from './client';

export async function fetchTvSeries(
  id: number | string,
  options: Readonly<{ includeImages?: boolean }> = { includeImages: false },
) {
  const series = (await apiFetch(`/series/${id}`, {
    query: {
      include_images: options.includeImages,
    },
  })) as TvSeries | undefined;
  return series;
}

export async function fetchTvSeriesSeason(
  id: number | string,
  seasonNumber: number | string,
) {
  const season = (await apiFetch(`/series/${id}/season/${seasonNumber}`)) as
    | Season
    | undefined;
  return season;
}

export async function fetchTvSeriesEpisode(
  id: number | string,
  seasonNumber: number | string,
  episodeNumber: number | string,
) {
  const episode = (await apiFetch(
    `/series/${id}/season/${seasonNumber}/episode/${episodeNumber}`,
  )) as Episode | undefined;
  return episode;
}

export async function fetchTvSeriesImages(
  id: number | string,
  language?: string,
) {
  const images = (await apiFetch(`/series/${id}/images`, {
    query: {
      language,
    },
  })) as Readonly<{
    backdrops: Readonly<{
      url: string;
      path: string;
    }>[];
    titleTreatment: Readonly<{
      url: string;
      path: string;
    }>[];
  }>;
  return images;
}

export async function fetchTvSeriesContentRating(
  id: number | string,
  region: string = 'US',
) {
  const contentRating = (await apiFetch(`/series/${id}/content-rating`, {
    query: {
      region,
    },
  })) as string | undefined;
  return contentRating;
}

export async function fetchTvSeriesWatchProviders(
  id: number | string,
  region: string = 'US',
) {
  const watchProviders = (await apiFetch(`/series/${id}/watch-providers`, {
    query: {
      region,
    },
  })) as WatchProvider[];
  return watchProviders;
}

export async function fetchTvSeriesWatchProvider(
  id: number | string,
  region: string,
  user?: Pick<User, 'watchProviders'> | null,
) {
  const providers = await fetchTvSeriesWatchProviders(id, region);

  if (providers.length === 0) {
    return undefined;
  }

  // If user has preferred providers, find the first matching one
  if (user?.watchProviders && user.watchProviders.length > 0) {
    const matchingProvider = user.watchProviders
      .map((userProvider) => providers.find((p) => p.id === userProvider.id))
      .filter(Boolean)[0];

    if (matchingProvider) {
      return matchingProvider;
    }
  }

  return providers[0];
}

export async function fetchTvSeriesRating(
  id: number | string,
  source: string = 'imdb',
) {
  const rating = (await apiFetch(`/series/${id}/rating`, {
    query: {
      source,
    },
  })) as Rating | null;
  return rating;
}

export async function fetchTvSeriesCredits(id: number | string) {
  const credits = (await apiFetch(`/series/${id}/credits`)) as Readonly<{
    cast: Person[];
    crew: Person[];
  }>;
  return credits;
}

export async function fetchTvSeriesRecommendations(id: number | string) {
  const recommendations = (await apiFetch(
    `/series/${id}/recommendations`,
  )) as TvSeries[];
  return recommendations;
}

export async function fetchTvSeriesKeywords(id: number | string) {
  const keywords = (await apiFetch(`/series/${id}/keywords`)) as Readonly<{
    id: number;
    name: string;
  }>[];
  return keywords;
}
