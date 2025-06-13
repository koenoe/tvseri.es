import { cachedUser } from '@/app/cached';
import { getFollowers, getFollowing } from '@/lib/db/follow';
import enrichUsersWithFollowInfo from '@/lib/enrichUsersWithFollowInfo';

import Card from './Card';

export default async function CardContainer({
  username,
  type,
}: Readonly<{
  username: string;
  type: 'following' | 'followers';
}>) {
  const user = await cachedUser({ username });
  if (!user) {
    return null;
  }

  const payload = {
    userId: user.id,
  };

  const { items, nextCursor } = await (type === 'following'
    ? getFollowing(payload)
    : getFollowers(payload));

  if (items.length === 0) {
    return null;
  }

  const users = await enrichUsersWithFollowInfo(items, {
    username,
    type,
  });

  return (
    <Card
      title={type === 'following' ? 'Following' : 'Followers'}
      items={users}
      nextCursor={nextCursor}
      loadMoreUrl={`/api/u/${username}/social/${type}`}
    />
  );
}
