import { getListItemsCount } from '@/lib/db/list';
import { getAllWatchedByDate } from '@/lib/db/watched';

import Block from './Block';

export default async function BlockSeriesInProgress({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const payload = {
    userId,
    startDate: new Date(`${year}-01-01`),
    endDate: new Date(`${year}-12-31`),
  };
  const [count, items] = await Promise.all([
    getListItemsCount({
      listId: 'WATCHED',
      ...payload,
    }),
    getAllWatchedByDate(payload),
  ]);
  const uniqueSeries = new Set(items.map((item) => item.seriesId));
  const uniqueSeriesCount = uniqueSeries.size;
  const inProgressCount = uniqueSeriesCount - count;

  return <Block label="In progress" value={inProgressCount.toLocaleString()} />;
}
