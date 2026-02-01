import { Suspense } from 'react';

import { cachedUser } from '@/app/cached';
import Grid from '@/components/Grid/Grid';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';
import WatchlistContainer from '@/components/User/WatchlistContainer';

type Props = Readonly<{
  params: Promise<{ username: string }>;
}>;

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const user = await cachedUser({ username });
  if (!user) {
    return {};
  }

  return {
    title: `${user.username}'s watchlist`,
  };
}

export default function WatchlistPage({ params }: Props) {
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
      <WatchlistContainer params={params} />
    </Suspense>
  );
}
