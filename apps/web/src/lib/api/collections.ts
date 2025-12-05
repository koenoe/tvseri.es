import type { TvSeries } from '@tvseri.es/schemas';

import { apiFetch } from './client';

export async function fetchTrendingTvSeries() {
  const series = (await apiFetch('/collection/trending')) as TvSeries[];
  return series;
}

export async function fetchTopRatedTvSeries() {
  const series = (await apiFetch('/collection/top-rated')) as TvSeries[];
  return series;
}

export async function fetchMostPopularTvSeriesThisMonth() {
  const series = (await apiFetch(
    '/collection/most-popular-this-month',
  )) as TvSeries[];
  return series;
}

export async function fetchMostAnticipatedTvSeries() {
  const series = (await apiFetch('/collection/most-anticipated')) as TvSeries[];
  return series;
}

export async function fetchKoreasFinestTvSeries() {
  const series = (await apiFetch('/collection/koreas-finest')) as TvSeries[];
  return series;
}

export async function fetchBestBritishCrimeTvSeries() {
  const series = (await apiFetch(
    '/collection/best-british-crime',
  )) as TvSeries[];
  return series;
}

export async function fetchBestSportsDocumentariesTvSeries() {
  const series = (await apiFetch(
    '/collection/best-sports-documentaries',
  )) as TvSeries[];
  return series;
}

export async function fetchApplePlusTvSeries(region?: string) {
  const series = (await apiFetch('/collection/must-watch-on-apple-tv', {
    query: {
      region,
    },
  })) as TvSeries[];
  return series;
}

export async function fetchNetflixOriginals(region?: string) {
  const series = (await apiFetch('/collection/netflix-originals', {
    query: {
      region,
    },
  })) as TvSeries[];
  return series;
}

export async function fetchPopularTvSeriesByYear(year?: number | string) {
  const items = (await apiFetch('/popular/:year', {
    params: {
      year,
    },
  })) as TvSeries[];
  return items;
}
