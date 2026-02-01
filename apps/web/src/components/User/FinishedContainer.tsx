import { notFound } from 'next/navigation';

import { cachedUser } from '@/app/cached';
import ListGrid from '@/components/Grid/ListGrid';

export default async function FinishedContainer({
  params,
}: Readonly<{ params: Promise<{ username: string }> }>) {
  const { username } = await params;
  const user = await cachedUser({ username });
  if (!user) {
    return notFound();
  }

  return <ListGrid listId="WATCHED" user={user} />;
}
