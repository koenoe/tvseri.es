import type { TvSeries } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';
import { toPosterItem } from '@/utils/toPosterItem';
import { toSpotlightTvSeries } from '@/utils/toSpotlightTvSeries';

import { apiFetch } from './client';
import { withStringId } from './withStringId';

// Public catalogue data: cacheLife profiles mirror the API's Cache-Control.
// Each getter maps to the shape its component reads (posters or the
// spotlight) inside the cache scope, so cache entries and RSC payloads stay
// small.

async function fetchPosterCollection(path: string) {
  const items = await apiFetch<TvSeries[]>(path);
  return items.map(toPosterItem);
}

export async function fetchTrendingTvSeries() {
  'use cache';
  cacheLife('short');
  cacheTag('collection:trending');
  const items = await apiFetch<TvSeries[]>('/collection/trending');
  return items.map(toSpotlightTvSeries);
}

export async function fetchTopRatedTvSeries() {
  'use cache';
  cacheLife('long');
  cacheTag('collection:top-rated');
  return fetchPosterCollection('/collection/top-rated');
}

/**
 * Returns the month (computed inside the cache scope, so it never needs
 * `new Date()` during a prerender) together with its items.
 */
export async function fetchMostPopularTvSeriesThisMonth() {
  'use cache';
  cacheLife('short');
  cacheTag('collection:most-popular-this-month');
  const items = await fetchPosterCollection(
    '/collection/most-popular-this-month',
  );
  const month = new Date().toLocaleString('default', { month: 'long' });
  return { items, month };
}

export async function fetchMostAnticipatedTvSeries() {
  'use cache';
  cacheLife('short');
  cacheTag('collection:most-anticipated');
  return fetchPosterCollection('/collection/most-anticipated');
}

export async function fetchKoreasFinestTvSeries() {
  'use cache';
  cacheLife('long');
  cacheTag('collection:koreas-finest');
  return fetchPosterCollection('/collection/koreas-finest');
}

export async function fetchBestBritishCrimeTvSeries() {
  'use cache';
  cacheLife('long');
  cacheTag('collection:best-british-crime');
  return fetchPosterCollection('/collection/best-british-crime');
}

export async function fetchBestSportsDocumentariesTvSeries() {
  'use cache';
  cacheLife('long');
  cacheTag('collection:best-sports-documentaries');
  return fetchPosterCollection('/collection/best-sports-documentaries');
}

/**
 * Not region-specific on purpose: the home page is fully static, so this
 * never reads headers or cookies. The API falls back to the US watch region.
 */
export async function fetchApplePlusTvSeries() {
  'use cache';
  cacheLife('long');
  cacheTag('collection:apple-tv');
  return fetchPosterCollection('/collection/must-watch-on-apple-tv');
}

async function fetchCachedPopularTvSeriesByYear(year: string) {
  'use cache';
  cacheLife('medium');
  cacheTag(`popular:${year}`);
  const items = await apiFetch<TvSeries[]>('/popular/:year', {
    params: {
      year,
    },
  });
  return items.map(toPosterItem);
}

export const fetchPopularTvSeriesByYear = withStringId(
  fetchCachedPopularTvSeriesByYear,
);
