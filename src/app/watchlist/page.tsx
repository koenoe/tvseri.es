import { Suspense } from 'react';

import Grid from '@/components/Grid/Grid';
import WatchlistGrid from '@/components/Grid/WatchlistGrid';
import Page from '@/components/Page/Page';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';

export default async function WatchlistPage() {
  return (
    <Page backgroundContext="dots">
      <div className="container">
        <Suspense
          fallback={
            <Grid>
              {[...Array(18)].map((_, index) => (
                <SkeletonPoster key={index} />
              ))}
            </Grid>
          }
        >
          <WatchlistGrid />
        </Suspense>
      </div>
    </Page>
  );
}
