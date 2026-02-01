import { notFound } from 'next/navigation';

import { cachedUser } from '@/app/cached';
import InProgressGrid from '@/components/Grid/InProgressGrid';

export default async function InProgressPageContainer({
  params,
}: Readonly<{ params: Promise<{ username: string }> }>) {
  const { username } = await params;
  const user = await cachedUser({ username });
  if (!user) {
    return notFound();
  }

  return <InProgressGrid user={user} />;
}
