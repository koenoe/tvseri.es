import { notFound } from 'next/navigation';

import { cachedUser } from '@/app/cached';
import HistoryContainer from '@/components/History/HistoryContainer';

export default async function HistoryPageContainer({
  params,
}: Readonly<{ params: Promise<{ username: string }> }>) {
  const { username } = await params;
  const user = await cachedUser({ username });
  if (!user) {
    return notFound();
  }

  return <HistoryContainer user={user} />;
}
