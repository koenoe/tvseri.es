import type { ListId, User } from '@tvseri.es/schemas';

import { getListItems } from '@/lib/api';

import InfiniteGrid from './InfiniteGrid';

export default async function ListGrid({
  user,
  listId,
}: Readonly<{ user: User; listId: ListId }>) {
  const response = await getListItems({
    listId,
    userId: user.id,
  });

  const endpoint = `/api/u/${user.username}/list/${listId.toLowerCase()}`;

  return (
    <InfiniteGrid
      endpoint={endpoint}
      items={response.items}
      nextCursor={response.nextCursor}
    />
  );
}
