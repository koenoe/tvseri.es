import { cookies } from 'next/headers';

import { fetchAccountDetails, fetchWatchlist } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import AccountListGrid from './AccountListGrid';

export default async function WatchlistGridContainer() {
  const encryptedSessionId = cookies().get('sessionId')?.value;

  if (!encryptedSessionId) {
    return null;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const { id: accountId } = await fetchAccountDetails(decryptedSessionId);

  const { items, totalNumberOfItems } = await fetchWatchlist({
    accountId,
    sessionId: decryptedSessionId,
  });

  return (
    <AccountListGrid
      listType="watchlist"
      items={items}
      totalNumberOfItems={totalNumberOfItems}
    />
  );
}
