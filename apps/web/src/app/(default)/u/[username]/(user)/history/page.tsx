import { Suspense } from 'react';

import { cachedUser } from '@/app/cached';
import HistoryCardSkeleton from '@/components/History/HistoryCardSkeleton';
import HistoryPageContainer from '@/components/User/HistoryPageContainer';

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
    title: `${user.username}'s history`,
  };
}

export default function HistoryPage({ params }: Props) {
  return (
    <Suspense fallback={<HistoryCardSkeleton />}>
      <HistoryPageContainer params={params} />
    </Suspense>
  );
}
