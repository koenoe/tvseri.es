import { getStatsSummary } from '@/lib/api';
import calculatePercentageDelta from '@/utils/calculatePercentageDelta';

import Block from './Block';

export default async function BlockEpisodesWatched({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const summary = await getStatsSummary({ userId, year });

  const delta = calculatePercentageDelta(
    summary.current.episodeCount,
    summary.previous.episodeCount,
  );

  return (
    <Block
      comparison={{
        delta,
        previousValue: summary.previous.episodeCount.toLocaleString(),
        type: 'percentage',
      }}
      label="Episodes watched"
      value={summary.current.episodeCount.toLocaleString()}
    />
  );
}
