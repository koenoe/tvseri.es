import { cachedUniqueWatchedByYear } from '@/app/cached';
import calculatePercentageDelta from '@/utils/calculatePercentageDelta';

import Block from './Block';

export default async function BlockTvSeriesWatched({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const [current, previous] = await Promise.all([
    cachedUniqueWatchedByYear({ userId, year }),
    cachedUniqueWatchedByYear({ userId, year: year - 1 }),
  ]);

  const delta = calculatePercentageDelta(current.length, previous.length);

  return (
    <Block
      comparison={{
        delta,
        previousValue: previous.length.toLocaleString(),
        type: 'percentage',
      }}
      label="Series tracked"
      value={current.length.toLocaleString()}
    />
  );
}
