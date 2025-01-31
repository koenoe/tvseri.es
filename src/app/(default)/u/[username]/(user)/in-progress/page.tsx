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
    <Suspense
      fallback={
        <div className="relative grid w-full grid-cols-1 gap-6 md:gap-10 xl:grid-cols-2">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="relative flex aspect-[16/18] flex-shrink-0 items-end overflow-hidden rounded-lg bg-neutral-800/60 shadow-lg after:absolute after:inset-0 after:rounded after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:aspect-[16/14] lg:aspect-[16/8] xl:aspect-[16/15] 2xl:aspect-[16/12]"
            >
              <div className="absolute inset-0 h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>
          ))}
        </div>
      }
    >
      <InProgressGrid user={user} />
    </Suspense>
  );
}
