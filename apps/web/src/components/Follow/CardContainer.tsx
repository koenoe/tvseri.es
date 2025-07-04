import { cachedUser } from '@/app/cached';
import auth from '@/auth';
import { getFollowers, getFollowing } from '@/lib/api';

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

  const { encryptedSessionId } = await auth();
  const payload = {
    sessionId: encryptedSessionId ?? undefined,
    userId: user.id,
  };

  const { items, nextCursor } = await (type === 'following'
    ? getFollowing(payload)
    : getFollowers(payload));

  if (items.length === 0) {
    return null;
  }

  return (
    <Card
      items={items}
      loadMoreUrl={`/api/u/${username}/social/${type}`}
      nextCursor={nextCursor}
      title={type === 'following' ? 'Following' : 'Followers'}
    />
  );
}
