import type { TmdbDiscoverQuery } from '@tvseri.es/schemas';
import { Suspense } from 'react';

import DiscoverGrid from '@/components/Grid/DiscoverGrid';
import Grid from '@/components/Grid/Grid';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';

export default async function DiscoverPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<TmdbDiscoverQuery>;
}>) {
  return (
    <Suspense
      fallback={
        <Grid>
          {[...Array(18)].map((_, index) => (
            <SkeletonPoster key={index} />
          ))}
        </Grid>
      }
    >
      <DiscoverGrid searchParams={searchParams} />
    </Suspense>
  );
}
