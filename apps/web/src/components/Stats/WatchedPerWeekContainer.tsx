import { getISOWeek } from 'date-fns';

import { cachedWatchedByYear } from '@/app/cached';

import WatchedPerWeek from './WatchedPerWeekLazy';

type WeeklyCount = {
  week: number;
  episodes: number;
  totalRuntime: number;
  runtimeHours: number;
};

type Input = Readonly<{
  userId: string;
  year: number | string;
}>;

const getWeeklyWatchedCount = async (input: Input): Promise<WeeklyCount[]> => {
  const items = await cachedWatchedByYear(input);

  // Always create 53 weeks of data
  const weekCounts: WeeklyCount[] = Array.from({ length: 53 }, (_, i) => ({
    episodes: 0,
    runtimeHours: 0,
    totalRuntime: 0,
    week: i + 1,
  }));

  items.forEach((item) => {
    const date = new Date(item.watchedAt);
    const weekNumber = getISOWeek(date);

    if (weekNumber <= 53) {
      weekCounts[weekNumber - 1]!.episodes += 1;
      weekCounts[weekNumber - 1]!.totalRuntime += item.runtime || 0;
    }
  });

  // Convert runtime to hours for better visual scaling with episode counts
  weekCounts.forEach((week) => {
    // Simple logic: Use hours directly, which naturally creates good proportions
    // - Anime (many short episodes): 60 episodes vs 20 hours → episodes bar larger
    // - Drama series (few long episodes): 5 episodes vs 7.5 hours → runtime bar larger
    // This way the bar sizes reflect which metric is more significant for that viewing pattern
    week.runtimeHours = Math.round((week.totalRuntime / 60) * 10) / 10; // Round to 1 decimal
  });

  return weekCounts;
};

const cachedWeeklyWatchedCount = async (input: Input) => {
  const stats = await getWeeklyWatchedCount(input);

  return stats;
};

export default async function WatchedPerWeekContainer({ userId, year }: Input) {
  const data = await cachedWeeklyWatchedCount({ userId, year });

  return <WatchedPerWeek data={data} year={parseInt(`${year}`, 10)} />;
}
