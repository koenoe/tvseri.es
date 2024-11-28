import { cookies } from 'next/headers';

import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import { fetchFavorites } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import InfiniteGrid from './InfiniteGrid';

export default async function FavoritesGrid() {
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return null;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const session = await findSession(decryptedSessionId);

  if (!session || !session.tmdbSessionId) {
    return null;
  }

  const user = await findUser({ userId: session.userId });

  if (!user || !user.tmdbAccountId) {
    return null;
  }

  const { items, totalNumberOfItems, totalNumberOfPages } =
    await fetchFavorites({
      accountId: user.tmdbAccountId,
      sessionId: session.tmdbSessionId,
    });

  return (
    <InfiniteGrid
      endpoint="/api/account/favorites"
      items={items}
      totalNumberOfItems={totalNumberOfItems}
      totalNumberOfPages={totalNumberOfPages}
    />
  );
}
