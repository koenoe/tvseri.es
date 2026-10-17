import type { TvSeries } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from './client';
import { withStringId } from './withStringId';

// Public catalogue data: cacheLife profiles mirror the API's Cache-Control.

export async function fetchTrendingTvSeries() {
  'use cache';
  cacheLife('short');
  cacheTag('collection:trending');
  return apiFetch<TvSeries[]>('/collection/trending');
}

export async function fetchTopRatedTvSeries() {
  'use cache';
  cacheLife('long');
  cacheTag('collection:top-rated');
  return apiFetch<TvSeries[]>('/collection/top-rated');
}

/**
 * Returns the month (computed inside the cache scope, so it never needs
 * `new Date()` during a prerender) together with its items.
 */
export async function fetchMostPopularTvSeriesThisMonth() {
  'use cache';
  cacheLife('short');
  cacheTag('collection:most-popular-this-month');
  const items = await apiFetch<TvSeries[]>(
    '/collection/most-popular-this-month',
  );
  const month = new Date().toLocaleString('default', { month: 'long' });
  return { items, month };
}

export async function fetchMostAnticipatedTvSeries() {
  'use cache';
  cacheLife('short');
  cacheTag('collection:most-anticipated');
  return apiFetch<TvSeries[]>('/collection/most-anticipated');
}

export async function fetchKoreasFinestTvSeries() {
  'use cache';
  cacheLife('long');
  cacheTag('collection:koreas-finest');
  return apiFetch<TvSeries[]>('/collection/koreas-finest');
}

export async function fetchBestBritishCrimeTvSeries() {
  'use cache';
  cacheLife('long');
  cacheTag('collection:best-british-crime');
  return apiFetch<TvSeries[]>('/collection/best-british-crime');
}

export async function fetchBestSportsDocumentariesTvSeries() {
  'use cache';
  cacheLife('long');
  cacheTag('collection:best-sports-documentaries');
  return apiFetch<TvSeries[]>('/collection/best-sports-documentaries');
}

export async function fetchApplePlusTvSeries(region?: string) {
  'use cache';
  cacheLife('long');
  cacheTag('collection:apple-tv');
  return apiFetch<TvSeries[]>('/collection/must-watch-on-apple-tv', {
    query: {
      region,
    },
  });
}

async function fetchCachedPopularTvSeriesByYear(year: string) {
  'use cache';
  cacheLife('medium');
  cacheTag(`popular:${year}`);
  return apiFetch<TvSeries[]>('/popular/:year', {
    params: {
      year,
    },
  });
}

export const fetchPopularTvSeriesByYear = withStringId(
  fetchCachedPopularTvSeriesByYear,
);
