import type { TmdbDiscoverQuery } from '@tvseri.es/types';
import { headers } from 'next/headers';

import { fetchDiscoverTvSeries } from '@/lib/api';

import InfiniteGrid from './InfiniteGrid';

export default async function DiscoverGrid({
  searchParams,
}: Readonly<{
  searchParams: Promise<TmdbDiscoverQuery>;
}>) {
  const [headerStore, query] = await Promise.all([headers(), searchParams]);
  const region = headerStore.get('cloudfront-viewer-country') || 'US';
  const { items, totalNumberOfItems, queryString } =
    await fetchDiscoverTvSeries({
      ...query,
      watch_region: region,
    });

  return (
    <InfiniteGrid
      endpoint={`/api/tv/discover${queryString}`}
      items={items}
      nextPageOrCursor={totalNumberOfItems === items.length ? null : '2'}
    />
  );
}
