import { Suspense } from 'react';

import { cachedUser } from '@/app/cached';
import StatsPageContainer from '@/components/User/StatsPageContainer';

type Props = Readonly<{
  params: Promise<{ username: string; year: number }>;
}>;

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const user = await cachedUser({ username });
  if (!user) {
    return {};
  }

  return {
    title: `A year of tvseri.es with ${user.username}`,
  };
}

export default function StatsByYearPage({ params }: Props) {
  return (
    <Suspense>
      <StatsPageContainer params={params} />
    </Suspense>
  );
}
