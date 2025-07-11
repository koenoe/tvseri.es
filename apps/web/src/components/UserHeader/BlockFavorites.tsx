import { cachedUser } from '@/app/cached';
import { getListItemsCount } from '@/lib/api';

import Block from './Block';

export default async function BlockFavorites({
  params,
}: Readonly<{
  params: Promise<{
    username: string;
  }>;
}>) {
  const { username } = await params;
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
