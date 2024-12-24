import { cache } from 'react';

import { cachedWatchedByYear } from '@/lib/cached';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { getListItemsCount } from '@/lib/db/list';

import Block from './Block';

type Input = Readonly<{
  userId: string;
  year: number;
}>;

export const cachedInProgressCount = cache(async ({ userId, year }: Input) => {
  const key = `total-in-progress:v1:${userId}_${year}`;
  const cachedValue = await getCacheItem<number>(key);
  if (cachedValue) {
    return cachedValue;
  }

  const [count, items] = await Promise.all([
    getListItemsCount({
      listId: 'WATCHED',
      userId,
      startDate: new Date(`${year}-01-01`),
      endDate: new Date(`${year}-12-31`),
    }),
    cachedWatchedByYear({
      userId,
      year,
    }),
  ]);
  const uniqueSeries = new Set(items.map((item) => item.seriesId));
  const uniqueSeriesCount = uniqueSeries.size;
  const inProgressCount = uniqueSeriesCount - count;

  await setCacheItem<number>(key, inProgressCount, { ttl: 900 });

  return inProgressCount;
});

export default async function BlockSeriesInProgress({ userId, year }: Input) {
  const inProgressCount = await cachedInProgressCount({ userId, year });

  return <Block label="In progress" value={inProgressCount.toLocaleString()} />;
}
