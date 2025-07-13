import type { User } from '@tvseri.es/types';
import { Suspense } from 'react';
import { getListItems } from '@/lib/api';
import InProgressContainer from '../Tiles/InProgressContainer';

export default async function InProgressGrid({
  user,
}: Readonly<{ user: User }>) {
  const { items } = await getListItems({
    listId: 'IN_PROGRESS',
    options: { limit: 10 },
    userId: user.id,
  });

  return (
    <div className="relative grid w-full grid-cols-1 gap-6 md:gap-10 xl:grid-cols-2">
      {items.map((item) => (
        <Suspense
          fallback={
            <div className="relative flex aspect-[16/18] flex-shrink-0 items-end overflow-hidden rounded-lg bg-neutral-800/60 shadow-lg after:absolute after:inset-0 after:rounded after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:aspect-[16/14] lg:aspect-[16/8] xl:aspect-[16/15] 2xl:aspect-[16/12]">
              <div className="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>
          }
          key={item.id}
        >
          <InProgressContainer item={item} key={item.id} user={user} />
        </Suspense>
      ))}
    </div>
  );
}
