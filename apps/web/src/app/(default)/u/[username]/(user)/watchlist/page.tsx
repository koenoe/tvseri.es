import type { Metadata } from 'next';
import { notFound, unauthorized } from 'next/navigation';
import { Suspense } from 'react';
import auth from '@/auth';
import Grid from '@/components/Grid/Grid';
import ListGrid from '@/components/Grid/ListGrid';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';
import { findUser } from '@/lib/api';

type Props = Readonly<{
  params: Promise<{ username: string }>;
}>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await findUser({ username });
  if (!user) {
    return {};
  }

  return {
    title: `${user.username}'s watchlist`,
  };
}

export default async function WatchlistPage({ params }: Props) {
  const [{ user: viewer }, { username }] = await Promise.all([auth(), params]);
  if (!viewer) {
    unauthorized();
  }

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
      <ListGrid listId="WATCHLIST" user={user} />
    </Suspense>
  );
}
