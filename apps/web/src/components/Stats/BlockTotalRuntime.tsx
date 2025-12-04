import { getStatsSummary } from '@/lib/api';
import calculatePercentageDelta from '@/utils/calculatePercentageDelta';
import formatRuntime from '@/utils/formatRuntime';

import Block from './Block';

type Input = Readonly<{
  userId: string;
  year: number;
}>;

export default async function BlockTotalRuntime({ userId, year }: Input) {
  const summary = await getStatsSummary({ userId, year });

  const delta = calculatePercentageDelta(
    summary.current.totalRuntime,
    summary.previous.totalRuntime,
  );

  return (
    <Block
      comparison={{
        delta,
        previousValue: formatRuntime(summary.previous.totalRuntime, false),
        type: 'percentage',
      }}
      label="Total runtime"
      value={formatRuntime(summary.current.totalRuntime, false)}
    />
  );
}
