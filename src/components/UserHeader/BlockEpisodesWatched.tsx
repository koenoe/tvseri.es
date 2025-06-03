import { cache } from 'react';

import { cachedUser } from '@/app/cached';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { getWatchedCount } from '@/lib/db/watched';

import Block from './Block';

type Input = Readonly<{
  userId: string;
}>;

export const cachedWatchedCount = cache(async ({ userId }: Input) => {
  const key = `watched-count:${userId}`;
  const cachedValue = await getCacheItem<number>(key);
  if (cachedValue) {
    return cachedValue;
  }

  const count = await getWatchedCount({ userId });

  await setCacheItem<number>(key, count, { ttl: 900 });

  return count;
});

export default async function BlockEpisodesWatched({
  username,
}: Readonly<{ username: string }>) {
  const user = await cachedUser({ username });

  if (!user) {
    return null;
  }

  const count = await cachedWatchedCount({ userId: user.id });

  return <Block label="Episodes watched" value={count.toLocaleString()} />;
}
