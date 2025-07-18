import { cache } from 'react';

import { getWatchedRuntime } from '@/lib/api';
import calculatePercentageDelta from '@/utils/calculatePercentageDelta';
import formatRuntime from '@/utils/formatRuntime';

import Block from './Block';

type Input = Readonly<{
  userId: string;
  year: number;
}>;

export const cachedTotalRuntime = cache(async ({ userId, year }: Input) => {
  const runtime = await getWatchedRuntime({
    endDate: new Date(`${year}-12-31`),
    startDate: new Date(`${year}-01-01`),
    userId,
  });

  return runtime;
});

export default async function BlockTotalRuntime({ userId, year }: Input) {
  const [totalRuntime, previousYearRuntime] = await Promise.all([
    cachedTotalRuntime({ userId, year }),
    cachedTotalRuntime({ userId, year: year - 1 }),
  ]);

  const delta = calculatePercentageDelta(totalRuntime, previousYearRuntime);

  return (
    <Block
      comparison={{
        delta,
        previousValue: formatRuntime(previousYearRuntime, false),
        type: 'percentage',
      }}
      label="Total runtime"
      value={formatRuntime(totalRuntime, false)}
    />
  );
}
