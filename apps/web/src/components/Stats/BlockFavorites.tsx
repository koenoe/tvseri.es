import { getListItemsCount } from '@/lib/api';

import Block from './Block';

export default async function BlockFavorites({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const [current, previous] = await Promise.all([
    getListItemsCount({
      endDate: new Date(`${year}-12-31`),
      listId: 'FAVORITES',
      startDate: new Date(`${year}-01-01`),
      userId,
    }),
    getListItemsCount({
      endDate: new Date(`${year - 1}-12-31`),
      listId: 'FAVORITES',
      startDate: new Date(`${year - 1}-01-01`),
      userId,
    }),
  ]);

  const delta = current - previous;

  return (
    <Block
      comparison={{
        delta,
        previousValue: previous.toLocaleString(),
        type: 'absolute',
      }}
      label="Added to favorites"
      value={current.toLocaleString()}
    />
  );
}
