import type { Metadata } from 'next';
import { notFound, unauthorized } from 'next/navigation';
import { Suspense } from 'react';
import auth from '@/auth';
import CardContainer from '@/components/Follow/CardContainer';
import SkeletonCard from '@/components/Follow/SkeletonCard';
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
    title: `${user.username}'s friends`,
  };
}

export default async function SocialPage({ params }: Props) {
  const [{ user: viewer }, { username }] = await Promise.all([auth(), params]);
  if (!viewer) {
    unauthorized();
  }

  const user = await findUser({ username });
  if (!user) {
    return notFound();
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex-1 bg-neutral-900">
        <Suspense fallback={<SkeletonCard />}>
          <CardContainer
            type="following"
            userId={user.id}
            username={user.username}
          />
        </Suspense>
      </div>
      <div className="flex-1 bg-neutral-900">
        <Suspense fallback={<SkeletonCard />}>
          <CardContainer
            type="followers"
            userId={user.id}
            username={user.username}
          />
        </Suspense>
      </div>
    </div>
  );
}
