import type {
  Person,
  Rating,
  Season,
  TvSeries,
  User,
  WatchProvider,
} from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from './client';
import { withStringId } from './withStringId';

// Uncached on purpose: `@/app/cached` wraps these two with `use cache`.
export async function fetchTvSeries(
  id: number | string,
  options: Readonly<{ includeImages?: boolean }> = { includeImages: false },
) {
  return apiFetch<TvSeries>(`/series/${id}`, {
    notFound: 'null',
    query: {
      include_images: options.includeImages,
    },
  });
}

export async function fetchTvSeriesSeason(
  id: number | string,
  seasonNumber: number | string,
) {
  return apiFetch<Season>(`/series/${id}/season/${seasonNumber}`, {
    notFound: 'null',
  });
}

// Admin-only, so not cached. Null when TMDB has no images for the series.
export async function fetchTvSeriesImages(
  id: number | string,
  language?: string,
) {
  return apiFetch<
    Readonly<{
      backdrops: Readonly<{
        url: string;
        path: string;
      }>[];
      titleTreatment: Readonly<{
        url: string;
        path: string;
      }>[];
    }>
  >(`/series/${id}/images`, {
    notFound: 'null',
    query: {
      language,
    },
  });
}

// Public per-series data below: cacheLife mirrors the API's Cache-Control and
// everything is tagged `series:${id}`. Region is always an explicit argument.

async function fetchCachedTvSeriesContentRating(
  id: string,
  region: string = 'US',
) {
  'use cache';
  cacheLife('medium');
  cacheTag(`series:${id}`);
  return apiFetch<string>(`/series/${id}/content-rating`, {
    notFound: 'null',
    query: {
      region,
    },
  });
}

export const fetchTvSeriesContentRating = withStringId(
  fetchCachedTvSeriesContentRating,
);

async function fetchTvSeriesWatchProviders(id: string, region: string) {
  'use cache';
  cacheLife('short');
  cacheTag(`series:${id}`);
  return apiFetch<WatchProvider[]>(`/series/${id}/watch-providers`, {
    query: {
      region,
    },
  });
}

/**
 * The provider list is cached per (id, region); picking the user's preferred
 * provider happens outside the cache so `user` never becomes part of a key.
 */
export async function fetchTvSeriesWatchProvider(
  id: number | string,
  region: string,
  user?: Pick<User, 'watchProviders'> | null,
) {
  const providers = await fetchTvSeriesWatchProviders(String(id), region);

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

async function fetchCachedTvSeriesRating(id: string, source: string = 'imdb') {
  'use cache';
  cacheLife('short');
  cacheTag(`series:${id}`);
  return apiFetch<Rating>(`/series/${id}/rating`, {
    notFound: 'null',
    query: {
      source,
    },
  });
}

export const fetchTvSeriesRating = withStringId(fetchCachedTvSeriesRating);

async function fetchCachedTvSeriesCredits(id: string) {
  'use cache';
  cacheLife('medium');
  cacheTag(`series:${id}`);
  return apiFetch<
    Readonly<{
      cast: Person[];
      crew: Person[];
    }>
  >(`/series/${id}/credits`);
}

export const fetchTvSeriesCredits = withStringId(fetchCachedTvSeriesCredits);

async function fetchCachedTvSeriesRecommendations(id: string) {
  'use cache';
  cacheLife('short');
  cacheTag(`series:${id}`);
  return apiFetch<TvSeries[]>(`/series/${id}/recommendations`);
}

export const fetchTvSeriesRecommendations = withStringId(
  fetchCachedTvSeriesRecommendations,
);

async function fetchCachedTvSeriesKeywords(id: string) {
  'use cache';
  cacheLife('medium');
  cacheTag(`series:${id}`);
  const keywords = await apiFetch<
    Readonly<{
      id: number;
      name: string;
    }>[]
  >(`/series/${id}/keywords`, { notFound: 'null' });
  return keywords ?? [];
}

export const fetchTvSeriesKeywords = withStringId(fetchCachedTvSeriesKeywords);
