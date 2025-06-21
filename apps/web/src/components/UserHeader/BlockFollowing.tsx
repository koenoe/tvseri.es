import { cachedUser } from '@/app/cached';
import { getFollowingCount } from '@/lib/api';

import Block from './Block';

export default async function BlockFollowing({
  username,
}: Readonly<{
  username: string;
}>) {
  const user = await cachedUser({ username });

  if (!user) {
    return null;
  }

  const count = await getFollowingCount(user.id);

  return <Block label="Following" value={count.toLocaleString()} />;
}
