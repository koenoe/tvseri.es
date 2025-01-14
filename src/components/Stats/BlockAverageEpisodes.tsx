import { cachedWatchedByYear } from '@/lib/cached';
import calculatePercentageDelta from '@/utils/calculatePercentageDelta';

import Block from './Block';

function calculateDailyAverage(count: number, year: number): number {
  const daysInYear = year % 4 === 0 ? 366 : 365;
  return Math.round((count / daysInYear) * 10) / 10;
}

export default async function BlockAverageEpisodes({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const [current, previous] = await Promise.all([
    cachedWatchedByYear({ userId, year }),
    cachedWatchedByYear({ userId, year: year - 1 }),
  ]);

  const currentAvg = calculateDailyAverage(current.length, year);
  const previousAvg = calculateDailyAverage(previous.length, year - 1);
  const delta = calculatePercentageDelta(currentAvg, previousAvg);

  return (
    <Block
      label="Average per day"
      value={currentAvg.toLocaleString()}
      comparison={{
        previousValue: previousAvg.toLocaleString(),
        delta,
        type: 'percentage',
      }}
    />
  );
}
