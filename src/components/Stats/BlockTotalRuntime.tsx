import { cache } from 'react';

import { cachedWatchedByYear } from '@/lib/cached';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import formatRuntime from '@/utils/formatRuntime';

import Block from './Block';

type Input = Readonly<{
  userId: string;
  year: number;
}>;

export const cachedTotalRuntime = cache(async ({ userId, year }: Input) => {
  const key = `total-runtime:${userId}_${year}`;
  const cachedValue = await getCacheItem<number>(key);
  if (cachedValue) {
    return cachedValue;
  }

  const items = await cachedWatchedByYear({ userId, year });
  const totalRuntime = items.reduce(
    (sum, item) => sum + (item.runtime || 0),
    0,
  );

  await setCacheItem<number>(key, totalRuntime, { ttl: 900 });

  return totalRuntime;
});

export default async function BlockTotalRuntime({ userId, year }: Input) {
  const totalRuntime = await cachedTotalRuntime({ userId, year });

  return <Block label="Total runtime" value={formatRuntime(totalRuntime)} />;
}
