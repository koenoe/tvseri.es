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
      listId: 'FAVORITES',
      userId,
      startDate: new Date(`${year}-01-01`),
      endDate: new Date(`${year}-12-31`),
    }),
    getListItemsCount({
      listId: 'FAVORITES',
      userId,
      startDate: new Date(`${year - 1}-01-01`),
      endDate: new Date(`${year - 1}-12-31`),
    }),
  ]);

  const delta = current - previous;

  return (
    <Block
      label="Added to favorites"
      value={current.toLocaleString()}
      comparison={{
        previousValue: previous.toLocaleString(),
        delta,
        type: 'absolute',
      }}
    />
  );
}
