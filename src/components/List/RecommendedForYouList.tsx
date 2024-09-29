import { cookies } from 'next/headers';

import { fetchRecommendedTvSeries } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function RecommendedForYouList({
  priority,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean }>) {
  const cookieStore = await cookies();
  const encryptedAccessToken = cookieStore.get('accessToken')?.value;
  const encryptedAccountObjectId = cookieStore.get('accountObjectId')?.value;

  if (!encryptedAccessToken || !encryptedAccountObjectId) {
    return null;
  }

  const decryptedAccessToken = decryptToken(encryptedAccessToken);
  const decryptedAccountObjectId = decryptToken(encryptedAccountObjectId);

  const { items } = await fetchRecommendedTvSeries({
    accessToken: decryptedAccessToken,
    accountObjectId: decryptedAccountObjectId,
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
