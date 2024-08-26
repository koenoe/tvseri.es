import { headers } from 'next/headers';

import { fetchDiscoverTvSeries } from '@/lib/tmdb';
import { type TmdbDiscoverQuery } from '@/lib/tmdb/helpers';

import InfiniteGrid from './InfiniteGrid';

export default async function DiscoverGrid({
  query,
}: Readonly<{
  query?: TmdbDiscoverQuery;
}>) {
  const region = headers().get('x-vercel-ip-country') || 'US';
  const { items, totalNumberOfItems, totalNumberOfPages, queryString } =
    await fetchDiscoverTvSeries({
      ...query,
      watch_region: region,
    });
  const endpoint = `/api/tv/discover${queryString}`;

  return (
    <InfiniteGrid
      key={endpoint}
      endpoint={endpoint}
      items={items}
      totalNumberOfItems={totalNumberOfItems}
      totalNumberOfPages={totalNumberOfPages}
    />
  );
}
