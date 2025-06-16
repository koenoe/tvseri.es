import { type User } from '@tvseri.es/types';

import { getListItems } from '@/lib/db/list';

import InfiniteGrid from './InfiniteGrid';

export default async function ListGrid({
  user,
  listId,
}: Readonly<{ user: User; listId: string }>) {
  const response = await getListItems({
    userId: user.id,
    listId,
  });

  return (
    <InfiniteGrid
      endpoint={`/api/u/${user.username}/list/${listId.toLowerCase()}`}
      items={response.items}
      nextPageOrCursor={response.nextCursor}
    />
  );
}
