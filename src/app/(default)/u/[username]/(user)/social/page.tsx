import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import { cachedUser } from '@/app/cached';
import CardContainer from '@/components/Follow/CardContainer';

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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Suspense fallback={null}>
        <CardContainer username={user.username} type="following" />
      </Suspense>
      <Suspense fallback={null}>
        <CardContainer username={user.username} type="followers" />
      </Suspense>
    </div>
  );
}
