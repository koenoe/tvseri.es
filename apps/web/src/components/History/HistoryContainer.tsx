import type { User } from '@tvseri.es/schemas';

import { getWatched } from '@/lib/api';

import InfiniteHistoryCardStack from './InfiniteHistoryCardStack';
import { toHistoryItem } from './toHistoryItem';

export default async function HistoryContainer({
  user,
}: Readonly<{
  user: Pick<User, 'id' | 'username'>;
}>) {
  const { items, nextCursor } = await getWatched({
    options: { limit: 100 },
    userId: user.id,
  });

  if (items.length === 0) {
    return null;
  }

  // Note: only send what the history UI reads
  const historyItems = items.map(toHistoryItem);

  return (
    <InfiniteHistoryCardStack
      items={historyItems}
      nextCursor={nextCursor}
      username={user.username}
    />
  );
}
