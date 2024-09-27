import { cookies } from 'next/headers';

import { fetchAccountDetails, fetchFavorites } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import InfiniteGrid from './InfiniteGrid';

export default async function FavoritesGrid() {
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return null;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const { id: accountId } = await fetchAccountDetails(decryptedSessionId);

  const { items, totalNumberOfItems, totalNumberOfPages } =
    await fetchFavorites({
      accountId,
      sessionId: decryptedSessionId,
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
