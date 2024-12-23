import { getAllWatchedByDate } from '@/lib/db/watched';
import getWeekNumber from '@/utils/getWeekNumberFromDate';

import WatchedPerWeek from './WatchedPerWeek';

type WeeklyCount = {
  week: number;
  episodes: number;
};

const getWeeklyWatchedCount = async (
  input: Readonly<{
    userId: string;
    year: number;
  }>,
): Promise<WeeklyCount[]> => {
  const items = await getAllWatchedByDate({
    userId: input.userId,
    startDate: new Date(`${input.year}-01-01`),
    endDate: new Date(`${input.year}-12-31`),
  });

  // If the last day of the year is week 1, it's a 53-week year
  const lastDay = new Date(`${input.year}-12-31`);
  const lastWeekNumber = getWeekNumber(lastDay);
  const totalWeeks = lastWeekNumber === 1 ? 53 : 52;

  const weekCounts: WeeklyCount[] = Array.from(
    { length: totalWeeks },
    (_, i) => ({ week: i + 1, episodes: 0 }),
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
  year: number;
}>;

export default async function WatchedPerWeekContainer({ userId, year }: Props) {
  const data = await getWeeklyWatchedCount({ userId, year });

  return <WatchedPerWeek data={data} />;
}
