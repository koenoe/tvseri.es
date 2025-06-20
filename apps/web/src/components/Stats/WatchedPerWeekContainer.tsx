import { getISOWeek } from 'date-fns';

import { cachedWatchedByYear } from '@/app/cached';

import WatchedPerWeek from './WatchedPerWeek';

type WeeklyCount = {
  week: number;
  episodes: number;
};

type Input = Readonly<{
  userId: string;
  year: number | string;
}>;

const getWeeklyWatchedCount = async (input: Input): Promise<WeeklyCount[]> => {
  const items = await cachedWatchedByYear(input);

  // Always create 53 weeks of data
  const weekCounts: WeeklyCount[] = Array.from({ length: 53 }, (_, i) => ({
    week: i + 1,
    episodes: 0,
  }));

  items.forEach((item) => {
    const date = new Date(item.watchedAt);
    const weekNumber = getISOWeek(date);

    if (weekNumber <= 53) {
      weekCounts[weekNumber - 1]!.episodes += 1;
    }
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
