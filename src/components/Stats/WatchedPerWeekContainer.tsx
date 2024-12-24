import { getISOWeek } from 'date-fns';

import { cachedWatchedByYear } from '@/lib/cached';

import WatchedPerWeek from './WatchedPerWeek';

type WeeklyCount = {
  week: number;
  episodes: number;
};

const getWeeklyWatchedCount = async (
  input: Readonly<{
    userId: string;
    year: number | string;
  }>,
): Promise<WeeklyCount[]> => {
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
      weekCounts[weekNumber - 1].episodes += 1;
    }
  });

  return weekCounts;
};

type Props = Readonly<{
  userId: string;
  year: number | string;
}>;

export default async function WatchedPerWeekContainer({ userId, year }: Props) {
  const data = await getWeeklyWatchedCount({ userId, year });

  return <WatchedPerWeek data={data} year={parseInt(`${year}`, 10)} />;
}
