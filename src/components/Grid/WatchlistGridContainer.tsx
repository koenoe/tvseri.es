import { cookies } from 'next/headers';

import { fetchAccountDetails, fetchWatchlist } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import InfiniteGrid from './InfiniteGrid';

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
    <InfiniteGrid
      endpoint="/api/account/watchlist"
      items={items}
      totalNumberOfItems={totalNumberOfItems}
    />
  );
}
