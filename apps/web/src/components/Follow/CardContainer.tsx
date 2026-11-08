import auth from '@/auth';
import { getFollowers, getFollowing } from '@/lib/api';

import Card from './Card';
import { toFollowItem } from './toFollowItem';

export default async function CardContainer({
  userId,
  username,
  type,
}: Readonly<{
  userId: string;
  username: string;
  type: 'following' | 'followers';
}>) {
  const { accessToken } = await auth();
  const payload = {
    accessToken: accessToken ?? undefined,
    userId,
  };

  const { items, nextCursor } = await (type === 'following'
    ? getFollowing(payload)
    : getFollowers(payload));

  if (items.length === 0) {
    return null;
  }

  // Note: only send what the card reads
  const followItems = items.map(toFollowItem);

  return (
    <Card
      items={followItems}
      loadMoreUrl={`/api/u/${username}/social/${type}`}
      nextCursor={nextCursor}
      title={type === 'following' ? 'Following' : 'Followers'}
    />
  );
}
