import type { Metadata } from 'next';
import { notFound, unauthorized } from 'next/navigation';
import { Suspense } from 'react';
import auth from '@/auth';
import HistoryCardSkeleton from '@/components/History/HistoryCardSkeleton';
import HistoryContainer from '@/components/History/HistoryContainer';
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
    title: `${user.username}'s history`,
  };
}

export default async function HistoryPage({ params }: Props) {
  const [{ user: viewer }, { username }] = await Promise.all([auth(), params]);
  if (!viewer) {
    unauthorized();
  }

  const user = await findUser({ username });
  if (!user) {
    return notFound();
  }

  return (
    <Suspense fallback={<HistoryCardSkeleton />}>
      <HistoryContainer user={user} />
    </Suspense>
  );
}
