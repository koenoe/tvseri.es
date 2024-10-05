import { unstable_cache } from 'next/cache';
import { cookies } from 'next/headers';

import { fetchAccountDetails, fetchRecommendedForYou } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedRecommendedForYou = unstable_cache(
  fetchRecommendedForYou,
  ['recommended-for-you'],
  {
    revalidate: 86400, // 1 day
  },
);

export default async function RecommendedForYouList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  const cookieStore = await cookies();
  const encryptedAccessToken = cookieStore.get('accessToken')?.value;
  const encryptedAccountObjectId = cookieStore.get('accountObjectId')?.value;
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (
    !encryptedAccessToken ||
    !encryptedAccountObjectId ||
    !encryptedSessionId
  ) {
    return null;
  }

  const decryptedAccessToken = decryptToken(encryptedAccessToken);
  const decryptedAccountObjectId = decryptToken(encryptedAccountObjectId);
  const decryptedSessionId = decryptToken(encryptedSessionId);
  const { id: accountId } = await fetchAccountDetails(decryptedSessionId);

  const items = await cachedRecommendedForYou({
    accessToken: decryptedAccessToken,
    accountId,
    accountObjectId: decryptedAccountObjectId,
    sessionId: decryptedSessionId,
  });

  return (
    <List
      title="Recommended for you"
      scrollRestoreKey="recommended-for-you"
      {...rest}
    >
      {items.map((item) => (
        <Poster key={item.id} item={item} priority={priority} />
      ))}
    </List>
  );
}
