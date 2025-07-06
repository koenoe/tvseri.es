import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { cachedUser } from '@/app/cached';
import CardContainer from '@/components/Follow/CardContainer';
import SkeletonCard from '@/components/Follow/SkeletonCard';

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
    title: `${user.username}'s friends`,
  };
}

export default async function SocialPage({ params }: Props) {
  const { username } = await params;
  const user = await cachedUser({ username });
  if (!user) {
    return notFound();
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex-1 bg-neutral-900">
        <Suspense fallback={<SkeletonCard />}>
          <CardContainer type="following" username={user.username} />
        </Suspense>
      </div>
      <div className="flex-1 bg-neutral-900">
        <Suspense fallback={<SkeletonCard />}>
          <CardContainer type="followers" username={user.username} />
        </Suspense>
      </div>
    </div>
  );
}
