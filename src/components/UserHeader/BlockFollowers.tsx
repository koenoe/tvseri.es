import { cachedUser } from '@/app/cached';
import { getFollowerCount } from '@/lib/db/follow';

import Block from './Block';

export default async function BlockFollowers({
  username,
}: Readonly<{
  username: string;
}>) {
  const user = await cachedUser({ username });

  if (!user) {
    return null;
  }

  const count = await getFollowerCount(user.id);

  return <Block label="Followers" value={count.toLocaleString()} />;
}
