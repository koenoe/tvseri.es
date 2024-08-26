import { headers } from 'next/headers';

import { fetchDiscoverTvSeries } from '@/lib/tmdb';
import { type TmdbDiscoverQuery } from '@/lib/tmdb/helpers';

import InfiniteGrid from './InfiniteGrid';
import SearchParamsWrapper from './SearchParamsWrapper';

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

  return (
    <SearchParamsWrapper>
      <InfiniteGrid
        endpoint={`/api/tv/discover${queryString}`}
        items={items}
        totalNumberOfItems={totalNumberOfItems}
        totalNumberOfPages={totalNumberOfPages}
      />
    </SearchParamsWrapper>
  );
}
