import { getStatsSummary } from '@/lib/api';
import calculatePercentageDelta from '@/utils/calculatePercentageDelta';

import Block from './Block';

export default async function BlockTvSeriesWatched({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const summary = await getStatsSummary({ userId, year });

  const delta = calculatePercentageDelta(
    summary.current.seriesCount,
    summary.previous.seriesCount,
  );

  return (
    <Block
      comparison={{
        delta,
        previousValue: summary.previous.seriesCount.toLocaleString(),
        type: 'percentage',
      }}
      label="Series tracked"
      value={summary.current.seriesCount.toLocaleString()}
    />
  );
}
