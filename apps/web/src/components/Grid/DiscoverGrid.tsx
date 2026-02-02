import type { TmdbDiscoverQuery } from '@tvseri.es/schemas';

import { fetchDiscoverTvSeries } from '@/lib/api';
import { getRegion } from '@/lib/geo';

import InfiniteGrid from './InfiniteGrid';

export default async function DiscoverGrid({
  searchParams,
}: Readonly<{
  searchParams: Promise<TmdbDiscoverQuery>;
}>) {
  const [region, query] = await Promise.all([getRegion(), searchParams]);
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
