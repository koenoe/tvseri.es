import { Suspense } from 'react';

import Grid from '@/components/Grid/Grid';
import WatchlistGridContainer from '@/components/Grid/WatchlistGridContainer';
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
          <WatchlistGridContainer />
        </Suspense>
      </div>
    </Page>
  );
}
