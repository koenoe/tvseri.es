import { cache } from 'react';

import { cachedWatchedByYear } from '@/app/cached';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import calculatePercentageDelta from '@/utils/calculatePercentageDelta';
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
  const [totalRuntime, previousYearRuntime] = await Promise.all([
    cachedTotalRuntime({ userId, year }),
    cachedTotalRuntime({ userId, year: year - 1 }),
  ]);

  const delta = calculatePercentageDelta(totalRuntime, previousYearRuntime);

  return (
    <Block
      label="Total runtime"
      value={formatRuntime(totalRuntime, false)}
      comparison={{
        previousValue: formatRuntime(previousYearRuntime, false),
        delta,
        type: 'percentage',
      }}
    />
  );
}
