import { cache } from 'react';

import { cachedUser } from '@/app/cached';
import { getWatchedCount } from '@/lib/api';

import Block from './Block';

const cachedWatchedCount = cache(getWatchedCount);

export default async function BlockEpisodesWatched({
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

  const count = await cachedWatchedCount({ userId: user.id });

  return <Block label="Episodes watched" value={count.toLocaleString()} />;
}
