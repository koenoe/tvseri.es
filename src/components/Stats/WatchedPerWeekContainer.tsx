import { cachedWatchedByYear } from '@/lib/cached';
import getWeekNumber from '@/utils/getWeekNumberFromDate';

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
  const totalWeeks = 53;
  const weekCounts: WeeklyCount[] = Array.from(
    { length: totalWeeks },
    (_, i) => ({
      week: i + 1,
      episodes: 0,
    }),
  );

  items.forEach((item) => {
    const date = new Date(item.watchedAt);
    const week = getWeekNumber(date);

    if (week <= totalWeeks) {
      weekCounts[week - 1].episodes += 1;
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
  console.log(data);

  return <WatchedPerWeek data={data} year={parseInt(`${year}`, 10)} />;
}
