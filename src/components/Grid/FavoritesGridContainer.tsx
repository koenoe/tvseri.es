import { cookies } from 'next/headers';

import { fetchAccountDetails, fetchFavorites } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import AccountListGrid from './AccountListGrid';

export default async function FavoritesGridContainer() {
  const encryptedSessionId = cookies().get('sessionId')?.value;

  if (!encryptedSessionId) {
    return null;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const { id: accountId } = await fetchAccountDetails(decryptedSessionId);

  const { items, totalNumberOfItems } = await fetchFavorites({
    accountId,
    sessionId: decryptedSessionId,
  });

  return (
    <AccountListGrid
      listType="favorites"
      items={items}
      totalNumberOfItems={totalNumberOfItems}
    />
  );
}
