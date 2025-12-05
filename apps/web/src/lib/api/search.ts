import type { TvSeries } from '@tvseri.es/schemas';

import { apiFetch } from './client';

export async function searchTvSeries(
  query: string,
  {
    year,
  }: Readonly<{
    year?: number | string;
  }> = {},
) {
  const series = (await apiFetch('/search/series', {
    query: {
      q: query,
      year,
    },
  })) as TvSeries[];
  return series;
}
