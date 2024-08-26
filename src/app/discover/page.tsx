import { Suspense } from 'react';

import DiscoverGrid from '@/components/Grid/DiscoverGrid';
import Grid from '@/components/Grid/Grid';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';
import { type TmdbDiscoverQuery } from '@/lib/tmdb/helpers';

export default async function DiscoverPage({
  searchParams,
}: Readonly<{
  searchParams: {
    sort_by: TmdbDiscoverQuery extends undefined
      ? never
      : Extract<NonNullable<TmdbDiscoverQuery>['sort_by'], string>;
  };
}>) {
  const sortBy = searchParams?.sort_by;

  return (
    <Suspense
      key={sortBy}
      fallback={
        <Grid>
          {[...Array(18)].map((_, index) => (
            <SkeletonPoster key={index} />
          ))}
        </Grid>
      }
    >
      <DiscoverGrid
        query={
          sortBy
            ? {
                sort_by: sortBy,
              }
            : undefined
        }
      />
    </Suspense>
  );
}
