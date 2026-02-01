import { Suspense } from 'react';

import { cachedUser } from '@/app/cached';
import SkeletonCard from '@/components/Follow/SkeletonCard';
import SocialContainer from '@/components/User/SocialContainer';

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

export default function SocialPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex-1 bg-neutral-900">
            <SkeletonCard />
          </div>
          <div className="flex-1 bg-neutral-900">
            <SkeletonCard />
          </div>
        </div>
      }
    >
      <SocialContainer params={params} />
    </Suspense>
  );
}
