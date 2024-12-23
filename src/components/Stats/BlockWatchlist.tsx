import { getListItemsCount } from '@/lib/db/list';

import Block from './Block';

export default async function BlockWatchlist({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const count = await getListItemsCount({
    listId: 'WATCHLIST',
    userId,
    startDate: new Date(`${year}-01-01`),
    endDate: new Date(`${year}-12-31`),
  });

  return <Block label="Want to watch" value={count.toLocaleString()} />;
}
