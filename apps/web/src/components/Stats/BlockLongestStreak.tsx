import { cache } from 'react';

import { startOfDay, isEqual, addDays } from 'date-fns';

import { cachedWatchedByYear } from '@/app/cached';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';

import Block from './Block';

type Input = Readonly<{
  userId: string;
  year: number;
}>;

export const cachedLongestStreak = cache(async ({ userId, year }: Input) => {
  const key = `longest-streak:${userId}_${year}`;
  const cachedValue = await getCacheItem<number>(key);
  if (cachedValue) {
    return cachedValue;
  }

  const items = await cachedWatchedByYear({ userId, year });
  const uniqueDays = new Set(
    items.map((item) => startOfDay(item.watchedAt).getTime()),
  );
  const watchDates = Array.from(uniqueDays)
    .sort((a, b) => a - b)
    .map((timestamp) => new Date(timestamp));

  let currentStreak = 1;
  let longestStreak = 1;

  for (let i = 1; i < watchDates.length; i++) {
    const expectedDate = addDays(watchDates[i - 1]!, 1);

    if (isEqual(startOfDay(expectedDate), startOfDay(watchDates[i]!))) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  await setCacheItem<number>(key, longestStreak, { ttl: 900 });

  return longestStreak;
});

export default async function BlockLongestStreak({ userId, year }: Input) {
  const [currentStreak, previousStreak] = await Promise.all([
    cachedLongestStreak({ userId, year }),
    cachedLongestStreak({ userId, year: year - 1 }),
  ]);

  const delta = currentStreak - previousStreak;

  return (
    <Block
      label="Longest streak"
      value={`${currentStreak} day${currentStreak === 1 ? '' : 's'}`}
      comparison={{
        previousValue: `${previousStreak} day${previousStreak === 1 ? '' : 's'}`,
        delta,
        type: 'absolute',
      }}
    />
  );
}
