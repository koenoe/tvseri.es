import { getStatsSummary } from '@/lib/api';
import calculatePercentageDelta from '@/utils/calculatePercentageDelta';

import Block from './Block';

export default async function BlockAverageEpisodes({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const summary = await getStatsSummary({ userId, year });

  const delta = calculatePercentageDelta(
    summary.current.avgPerDay,
    summary.previous.avgPerDay,
  );

  return (
    <Block
      comparison={{
        delta,
        previousValue: summary.previous.avgPerDay.toLocaleString(),
        type: 'percentage',
      }}
      label="Average per day"
      value={summary.current.avgPerDay.toLocaleString()}
    />
  );
}
