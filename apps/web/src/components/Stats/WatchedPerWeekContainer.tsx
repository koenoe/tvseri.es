import { getStatsWeekly } from '@/lib/api';

import WatchedPerWeek from './WatchedPerWeekLazy';

type Input = Readonly<{
  userId: string;
  year: number | string;
}>;

export default async function WatchedPerWeekContainer({ userId, year }: Input) {
  const data = await getStatsWeekly({ userId, year });

  return <WatchedPerWeek data={data} year={parseInt(`${year}`, 10)} />;
}
