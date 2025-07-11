import { cachedUser } from '@/app/cached';
import { getFollowerCount } from '@/lib/api';

import Block from './Block';

export default async function BlockFollowers({
  params,
}: Readonly<{
  params: Promise<{
    username: string;
  }>;
}>) {
  const { username } = await params;
  const user = await cachedUser({ username });

  if (!user) {
    return null;
  }

  const count = await getFollowerCount(user.id);

  return <Block label="Followers" value={count.toLocaleString()} />;
}
