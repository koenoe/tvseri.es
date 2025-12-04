import { getStatsFavoritesCount } from '@/lib/api';

import Block from './Block';

export default async function BlockFavorites({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const { current, previous } = await getStatsFavoritesCount({
    userId,
    year,
  });

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
