import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { cachedUser } from '@/app/cached';
import Grid from '@/components/Grid/Grid';
import ListGrid from '@/components/Grid/ListGrid';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';

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

export default async function WatchedPage({ params }: Props) {
  const { username } = await params;
  const user = await cachedUser({ username });
  if (!user) {
    return notFound();
  }

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
      <ListGrid listId="WATCHED" user={user} />
    </Suspense>
  );
}
