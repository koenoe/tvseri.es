import { Suspense } from 'react';

import { type TmdbDiscoverQuery } from '@tvseri.es/types';

import DiscoverGrid from '@/components/Grid/DiscoverGrid';
import Grid from '@/components/Grid/Grid';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';

export default async function DiscoverPage({
  searchParams: searchParamsFromProps,
}: Readonly<{
  searchParams: Promise<TmdbDiscoverQuery>;
}>) {
  const searchParams = await searchParamsFromProps;
  const key = searchParams
    ? `discover-${JSON.stringify(searchParams)}`
    : 'discover';

  return (
    <Suspense
      key={key}
      fallback={
        <Grid>
          {[...Array(18)].map((_, index) => (
            <SkeletonPoster key={index} />
          ))}
        </Grid>
      }
    >
      <DiscoverGrid key={key} query={searchParams} />
    </Suspense>
  );
}
