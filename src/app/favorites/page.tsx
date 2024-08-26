import { Suspense } from 'react';

import FavoritesGrid from '@/components/Grid/FavoritesGrid';
import Grid from '@/components/Grid/Grid';
import PageDivider from '@/components/Page/Divider';
import Page from '@/components/Page/Page';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';

export default async function FavoritesPage() {
  return (
    <Page backgroundContext="dots">
      <div className="container">
        <PageDivider />
        <Suspense
          fallback={
            <Grid>
              {[...Array(18)].map((_, index) => (
                <SkeletonPoster key={index} />
              ))}
            </Grid>
          }
        >
          <FavoritesGrid />
        </Suspense>
      </div>
    </Page>
  );
}
