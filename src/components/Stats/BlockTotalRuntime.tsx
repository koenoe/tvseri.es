import { cachedWatchedByYear } from '@/lib/cached';
import formatRuntime from '@/utils/formatRuntime';

import Block from './Block';

export default async function BlockTotalRuntime({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const items = await cachedWatchedByYear({ userId, year });
  const totalRuntime = items.reduce(
    (sum, item) => sum + (item.runtime || 0),
    0,
  );

  return <Block label="Total runtime" value={formatRuntime(totalRuntime)} />;
}
