import type { TvSeries } from '@tvseri.es/schemas';

import { apiFetch } from './client';

// Free-text search: high cardinality, so not cached in-process.
export async function searchTvSeries(
  query: string,
  {
    year,
  }: Readonly<{
    year?: number | string;
  }> = {},
) {
  return apiFetch<TvSeries[]>('/search/series', {
    query: {
      q: query,
      year,
    },
  });
}
