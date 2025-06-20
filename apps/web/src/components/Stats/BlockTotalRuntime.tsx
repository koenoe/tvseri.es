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
    userId,
    startDate: new Date(`${year}-01-01`),
    endDate: new Date(`${year}-12-31`),
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
      label="Total runtime"
      value={formatRuntime(totalRuntime, false)}
      comparison={{
        previousValue: formatRuntime(previousYearRuntime, false),
        delta,
        type: 'percentage',
      }}
    />
  );
}
