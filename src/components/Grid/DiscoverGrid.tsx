import { fetchDiscoverTvSeries } from '@/lib/tmdb';

import InfiniteGrid from './InfiniteGrid';

export default async function DiscoverGrid() {
  const { items, totalNumberOfItems } = await fetchDiscoverTvSeries();

  return (
    <InfiniteGrid
      endpoint="/api/tv/discover"
      items={items}
      totalNumberOfItems={totalNumberOfItems}
    />
  );
}
