import { cache } from 'react';

import { cachedUser } from '@/app/cached';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { getAllWatched } from '@/lib/db/watched';
import formatRuntime from '@/utils/formatRuntime';

import Block from './Block';

type Input = Readonly<{
  userId: string;
}>;

export const cachedTotalRuntime = cache(async ({ userId }: Input) => {
  const key = `total-runtime:${userId}`;
  const cachedValue = await getCacheItem<number>(key);
  if (cachedValue) {
    return cachedValue;
  }

  const items = await getAllWatched({ userId });
  const totalRuntime = items.reduce(
    (sum, item) => sum + (item.runtime || 0),
    0,
  );

  await setCacheItem<number>(key, totalRuntime, { ttl: 900 });

  return totalRuntime;
});

export default async function BlockTotalRuntime({
  username,
}: Readonly<{ username: string }>) {
  const user = await cachedUser({ username });

  if (!user) {
    return null;
  }

  const totalRuntime = await cachedTotalRuntime({ userId: user.id });

  return (
    <Block label="Total runtime" value={formatRuntime(totalRuntime, false)} />
  );
}
