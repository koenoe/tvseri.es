import 'server-only';

import { cache } from 'react';

import { unstable_cache } from 'next/cache';

import { fetchTvSeries } from './tmdb';

const cachedTvSeries = cache(async (id: string | number) =>
  unstable_cache(
    async () => {
      const items = await fetchTvSeries(id, {
        includeImages: true,
      });
      return items;
    },
    [`tv:${id}`],
    {
      revalidate: 86400, // 1 day
    },
  )(),
);

export default cachedTvSeries;
