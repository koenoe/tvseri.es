import { Suspense } from 'react';

import DiscoverGrid from '@/components/Grid/DiscoverGrid';
import Grid from '@/components/Grid/Grid';
import Page from '@/components/Page/Page';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';

export default async function DiscoverPage() {
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
          <DiscoverGrid />
        </Suspense>
      </div>
    </Page>
  );
}
