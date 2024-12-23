import { getAllWatchedByDate } from '@/lib/db/watched';
import formatRuntime from '@/utils/formatRuntime';

import Block from './Block';

export default async function BlockTotalRuntime({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const items = await getAllWatchedByDate({
    userId,
    startDate: new Date(`${year}-01-01`),
    endDate: new Date(`${year}-12-31`),
  });

  const totalRuntime = items.reduce(
    (sum, item) => sum + (item.runtime || 0),
    0,
  );

  return <Block label="Total runtime" value={formatRuntime(totalRuntime)} />;
}
