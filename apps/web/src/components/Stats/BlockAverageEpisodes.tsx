import { cachedWatchedByYear } from '@/app/cached';
import calculatePercentageDelta from '@/utils/calculatePercentageDelta';

import Block from './Block';

function calculateDailyAverage(
  count: number,
  year: number,
  currentDate = new Date(),
): number {
  if (year < currentDate.getFullYear()) {
    const daysInYear = year % 4 === 0 ? 366 : 365;
    return Math.round((count / daysInYear) * 10) / 10;
  }

  const startOfYear = new Date(year, 0, 1);
  const daysDiff =
    Math.floor(
      (currentDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
  return Math.round((count / daysDiff) * 10) / 10;
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
      comparison={{
        delta,
        previousValue: previousAvg.toLocaleString(),
        type: 'percentage',
      }}
      label="Average per day"
      value={currentAvg.toLocaleString()}
    />
  );
}
