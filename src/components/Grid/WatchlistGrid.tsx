import { cookies } from 'next/headers';

import { fetchAccountDetails, fetchWatchlist } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import InfiniteGrid from './InfiniteGrid';

export default async function WatchlistGrid() {
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return null;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const { id: accountId } = await fetchAccountDetails(decryptedSessionId);

  const { items, totalNumberOfItems, totalNumberOfPages } =
    await fetchWatchlist({
      accountId,
      sessionId: decryptedSessionId,
    });

  return (
    <InfiniteGrid
      endpoint="/api/account/watchlist"
      items={items}
      totalNumberOfItems={totalNumberOfItems}
      totalNumberOfPages={totalNumberOfPages}
    />
  );
}
