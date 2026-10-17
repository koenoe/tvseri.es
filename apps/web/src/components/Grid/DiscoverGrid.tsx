import { normalizeDiscoverQuery } from '@tvseri.es/schemas';

import { fetchDiscoverTvSeries } from '@/lib/api';
import getWatchRegion from '../DiscoverFilters/getWatchRegion';
import InfiniteGrid from './InfiniteGrid';

export default async function DiscoverGrid({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const rawQuery = await searchParams;
  // Note: the region only matters (and is only added) when filtering on watch providers
  const region = rawQuery.with_watch_providers
    ? await getWatchRegion()
    : undefined;
  const { query, queryString } = normalizeDiscoverQuery(rawQuery, { region });
  const { items, totalNumberOfPages } = await fetchDiscoverTvSeries(query);
  const endpoint = `/api/tv/discover${queryString}`;
  const nextCursor = totalNumberOfPages > 1 ? '2' : null;

  return (
    // Note: keyed by query so changing filters resets the loaded pages
    <InfiniteGrid
      endpoint={endpoint}
      items={items}
      key={queryString}
      nextCursor={nextCursor}
    />
  );
}
