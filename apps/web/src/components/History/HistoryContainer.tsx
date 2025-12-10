import type { User } from '@tvseri.es/schemas';

import { getWatched } from '@/lib/api';

import InfiniteHistoryCardStack from './InfiniteHistoryCardStack';

export default async function HistoryContainer({
  user,
}: Readonly<{
  user: User;
}>) {
  const { items, nextCursor } = await getWatched({
    options: { limit: 100 },
    userId: user.id,
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <InfiniteHistoryCardStack
      items={items}
      nextCursor={nextCursor}
      username={user.username}
    />
  );
}
