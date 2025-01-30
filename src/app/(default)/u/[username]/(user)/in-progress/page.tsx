import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import InProgressGrid from '@/components/Grid/InProgressGrid';
import { findUser } from '@/lib/db/user';

type Props = Readonly<{
  params: Promise<{ username: string }>;
}>;

export default async function InProgressPage({ params }: Props) {
  const { username } = await params;
  const user = await findUser({ username });
  if (!user) {
    return notFound();
  }

  return (
    <Suspense fallback={<>Loading...</>}>
      <InProgressGrid user={user} />
    </Suspense>
  );
}
