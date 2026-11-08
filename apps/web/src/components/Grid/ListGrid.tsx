import type { ListId, User } from '@tvseri.es/schemas';

import { getListItems } from '@/lib/api';
import { toPosterItem } from '@/utils/toPosterItem';

import InfiniteGrid from './InfiniteGrid';

export default async function ListGrid({
  user,
  listId,
}: Readonly<{ user: Pick<User, 'id' | 'username'>; listId: ListId }>) {
  const response = await getListItems({
    listId,
    userId: user.id,
  });

  const endpoint = `/api/u/${user.username}/list/${listId.toLowerCase()}`;
  // Note: only send what the poster tiles read
  const items = response.items.map(toPosterItem);

  return (
    <InfiniteGrid
      endpoint={endpoint}
      items={items}
      nextCursor={response.nextCursor}
    />
  );
}
