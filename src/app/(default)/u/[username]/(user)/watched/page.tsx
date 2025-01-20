import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import Grid from '@/components/Grid/Grid';
import ListGrid from '@/components/Grid/ListGrid';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';
import { findUser } from '@/lib/db/user';

type Props = Readonly<{
  params: Promise<{ username: string }>;
}>;

export default async function WatchedPage({ params }: Props) {
  const { username } = await params;
  const user = await findUser({ username });
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
      <ListGrid user={user} listId="WATCHED" />
    </Suspense>
  );
}
