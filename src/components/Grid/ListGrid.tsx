import { getListItems } from '@/lib/db/list';
import { type User } from '@/types/user';

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
      endpoint={`/api/u/${user.username}/${listId.toLowerCase()}`}
      items={response.items ?? []}
      nextPageOrCursor={response.nextCursor}
    />
  );
}
