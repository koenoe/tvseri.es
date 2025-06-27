import { addDays, isEqual, startOfDay } from 'date-fns';
import { cache } from 'react';

import { cachedWatchedByYear } from '@/app/cached';

import Block from './Block';

type Input = Readonly<{
  userId: string;
  year: number;
}>;

export const cachedLongestStreak = cache(async ({ userId, year }: Input) => {
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
      comparison={{
        delta,
        previousValue: `${previousStreak} day${previousStreak === 1 ? '' : 's'}`,
        type: 'absolute',
      }}
      label="Longest streak"
      value={`${currentStreak} day${currentStreak === 1 ? '' : 's'}`}
    />
  );
}
