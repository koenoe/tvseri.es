import type { User } from '@tvseri.es/types';

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
        <InProgressContainer item={item} key={item.id} user={user} />
      ))}
    </div>
  );
}
