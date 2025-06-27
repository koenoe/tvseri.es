import type { User } from '@tvseri.es/types';

import { getListItems } from '@/lib/api';

import InfiniteGrid from './InfiniteGrid';

export default async function ListGrid({
  user,
  listId,
}: Readonly<{ user: User; listId: string }>) {
  const response = await getListItems({
    listId,
    userId: user.id,
  });

  return (
    <InfiniteGrid
      endpoint={`/api/u/${user.username}/list/${listId.toLowerCase()}`}
      items={response.items}
      nextPageOrCursor={response.nextCursor}
    />
  );
}
