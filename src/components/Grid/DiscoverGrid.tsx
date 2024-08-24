import { fetchDiscoverTvSeries } from '@/lib/tmdb';
import { type TmdbDiscoverQuery } from '@/lib/tmdb/helpers';

import InfiniteGrid from './InfiniteGrid';

export default async function DiscoverGrid({
  query,
}: Readonly<{
  query?: TmdbDiscoverQuery;
}>) {
  const { items, totalNumberOfItems, queryString } =
    await fetchDiscoverTvSeries(query);

  return (
    <InfiniteGrid
      endpoint={`/api/tv/discover${queryString}`}
      items={items}
      totalNumberOfItems={totalNumberOfItems}
    />
  );
}
