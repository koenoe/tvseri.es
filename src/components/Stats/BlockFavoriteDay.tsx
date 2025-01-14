import { cache } from 'react';

import { format, getDay } from 'date-fns';

import { cachedWatchedByYear } from '@/lib/cached';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';

import Block from './Block';

type Input = Readonly<{
  userId: string;
  year: number;
}>;

export const cachedFavoriteDay = cache(async ({ userId, year }: Input) => {
  const key = `favorite-day:${userId}_${year}`;
  const cachedValue = await getCacheItem<string>(key);
  if (cachedValue) {
    return cachedValue;
  }

  const items = await cachedWatchedByYear({ userId, year });

  // Count episodes per day
  const dayCount = items.reduce(
    (acc, item) => {
      const dayOfWeek = getDay(item.watchedAt);
      acc[dayOfWeek] = (acc[dayOfWeek] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  // Find the day with most episodes
  let maxCount = 0;
  let favoriteDay = 0;

  Object.entries(dayCount).forEach(([day, count]) => {
    if (count > maxCount) {
      maxCount = count;
      favoriteDay = Number(day);
    }
  });

  // Format the day name (e.g., "Sunday")
  const dayName = format(new Date(year, 0, favoriteDay + 1), 'EEEE');

  await setCacheItem<string>(key, dayName, { ttl: 900 });

  return dayName;
});

export default async function BlockFavoriteDay({ userId, year }: Input) {
  const favoriteDay = await cachedFavoriteDay({ userId, year });

  return <Block label="Favorite day to watch" value={favoriteDay} />;
}
