import { headers } from 'next/headers';

import { fetchDiscoverTvSeries } from '@/lib/tmdb';
import {
  type TmdbDiscoverTvSeriesQuery,
  type TmdbDiscoverQuery,
} from '@/lib/tmdb/helpers';

import InfiniteGrid from './InfiniteGrid';

export default async function DiscoverGrid({
  query,
}: Readonly<{
  query?: TmdbDiscoverQuery;
}>) {
  const headerStore = await headers();
  const region =
    headerStore.get('x-vercel-ip-country') ||
    headerStore.get('cloudfront-viewer-country') ||
    'US';
  const { items, totalNumberOfItems, queryString } =
    await fetchDiscoverTvSeries({
      ...query,
      watch_region: region,
    } as TmdbDiscoverTvSeriesQuery);

  return (
    <InfiniteGrid
      endpoint={`/api/tv/discover${queryString}`}
      items={items}
      nextPageOrCursor={totalNumberOfItems === items.length ? null : '2'}
    />
  );
}
