import { cache } from 'react';

import { cachedWatchedByYear } from '@/lib/cached';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { getAllListItems } from '@/lib/db/list';

import Block from './Block';

type Input = Readonly<{
  userId: string;
  year: number;
}>;

export const cachedInProgressCount = cache(async ({ userId, year }: Input) => {
  const key = `total-in-progress:v3:${userId}_${year}`;
  const cachedValue = await getCacheItem<number>(key);
  if (cachedValue) {
    return cachedValue;
  }

  const [watchedTvSeries, watchedItems] = await Promise.all([
    getAllListItems({
      listId: 'WATCHED',
      userId,
      startDate: new Date('1970-01-01'),
      endDate: new Date(`${year}-12-31`),
    }),
    cachedWatchedByYear({
      userId,
      year,
    }),
  ]);
  const uniqueSeries = new Set(watchedItems.map((item) => item.seriesId));
  const completedSeriesIds = new Set(
    watchedTvSeries.map((series) => series.id),
  );
  const inProgressCount = Array.from(uniqueSeries).filter(
    (seriesId) => !completedSeriesIds.has(seriesId),
  ).length;

  await setCacheItem<number>(key, inProgressCount, { ttl: 900 });

  return inProgressCount;
});

export default async function BlockSeriesInProgress({ userId, year }: Input) {
  const inProgressCount = await cachedInProgressCount({ userId, year });

  return <Block label="In progress" value={inProgressCount.toLocaleString()} />;
}
