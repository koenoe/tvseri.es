import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { cachedUser } from '@/app/cached';
import InProgressGrid from '@/components/Grid/InProgressGrid';

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
    title: `${user.username}'s in progress`,
  };
}

export default async function InProgressPage({ params }: Props) {
  const { username } = await params;
  const user = await cachedUser({ username });
  if (!user) {
    return notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="relative grid w-full grid-cols-1 gap-6 md:gap-10 xl:grid-cols-2">
          {[...Array(4)].map((_, index) => (
            <div
              className="relative flex aspect-[16/18] flex-shrink-0 items-end overflow-hidden rounded-xl bg-neutral-800/60 shadow-lg after:absolute after:inset-0 after:rounded-xl after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:aspect-[16/14] lg:aspect-[16/8] xl:aspect-[16/15] 2xl:aspect-[16/12]"
              key={index}
            >
              <div className="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>
          ))}
        </div>
      }
    >
      <InProgressGrid user={user} />
    </Suspense>
  );
}
