import { cachedUser } from '@/app/cached';
import { getListItemsCount } from '@/lib/db/list';

import Block from './Block';

export default async function BlockFavorites({
  username,
}: Readonly<{
  username: string;
}>) {
  const user = await cachedUser({ username });

  if (!user) {
    return null;
  }

  const count = await getListItemsCount({
    listId: 'FAVORITES',
    userId: user.id,
  });

  return <Block label="Favorites" value={count.toLocaleString()} />;
}
