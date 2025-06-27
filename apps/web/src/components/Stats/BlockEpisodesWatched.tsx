import { cachedWatchedByYear } from '@/app/cached';
import calculatePercentageDelta from '@/utils/calculatePercentageDelta';

import Block from './Block';

export default async function BlockEpisodesWatched({
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

  const delta = calculatePercentageDelta(current.length, previous.length);

  return (
    <Block
      comparison={{
        delta,
        previousValue: previous.length.toLocaleString(),
        type: 'percentage',
      }}
      label="Episodes watched"
      value={current.length.toLocaleString()}
    />
  );
}
