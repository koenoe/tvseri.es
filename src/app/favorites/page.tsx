import { Suspense } from 'react';

import FavoritesGridContainer from '@/components/Grid/FavoritesGridContainer';
import Grid from '@/components/Grid/Grid';
import Page from '@/components/Page/Page';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';

export default async function FavoritesPage() {
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
          <FavoritesGridContainer />
        </Suspense>
      </div>
    </Page>
  );
}
