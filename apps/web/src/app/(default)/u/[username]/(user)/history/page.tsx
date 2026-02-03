import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { cachedUser } from '@/app/cached';
import HistoryCardSkeleton from '@/components/History/HistoryCardSkeleton';
import HistoryContainer from '@/components/History/HistoryContainer';

type Props = Readonly<{
  params: Promise<{ username: string }>;
}>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await cachedUser({ username });
  if (!user) {
    return {};
  }

  return {
    title: `${user.username}'s history`,
  };
}

export default async function HistoryPage({ params }: Props) {
  const { username } = await params;
  const user = await cachedUser({ username });
  if (!user) {
    return notFound();
  }

  return (
    <Suspense fallback={<HistoryCardSkeleton />}>
      <HistoryContainer user={user} />
    </Suspense>
  );
}
