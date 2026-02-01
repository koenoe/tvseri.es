import { Suspense } from 'react';

import { cachedUser } from '@/app/cached';
import Grid from '@/components/Grid/Grid';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';
import FinishedContainer from '@/components/User/FinishedContainer';

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
    title: `${user.username}'s finished series`,
  };
}

export default function WatchedPage({ params }: Props) {
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
      <FinishedContainer params={params} />
    </Suspense>
  );
}
