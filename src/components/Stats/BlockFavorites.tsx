import { getListItemsCount } from '@/lib/db/list';

import Block from './Block';

export default async function BlockFavorites({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const count = await getListItemsCount({
    listId: 'FAVORITES',
    userId,
    startDate: new Date(`${year}-01-01`),
    endDate: new Date(`${year}-12-31`),
  });

  return <Block label="Added to favorites" value={count.toLocaleString()} />;
}
