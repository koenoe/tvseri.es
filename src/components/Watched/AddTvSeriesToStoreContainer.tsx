import { cookies } from 'next/headers';

import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import { getAllWatchedForTvSeries } from '@/lib/db/watched';
import { decryptToken } from '@/lib/token';
import { type TvSeries } from '@/types/tv-series';

import AddTvSeriesToStore from './AddTvSeriesToStore';

export default async function AddTvSeriesToStoreContainer({
  tvSeries,
}: Readonly<{
  tvSeries: TvSeries;
}>) {
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;
  if (!encryptedSessionId) {
    return <AddTvSeriesToStore tvSeries={tvSeries} watched={[]} />;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const session = await findSession(decryptedSessionId);
  if (!session) {
    return <AddTvSeriesToStore tvSeries={tvSeries} watched={[]} />;
  }

  const user = await findUser({ userId: session.userId });
  if (!user) {
    return <AddTvSeriesToStore tvSeries={tvSeries} watched={[]} />;
  }

  const watched = await getAllWatchedForTvSeries({
    userId: session.userId,
    tvSeries,
  });

  return <AddTvSeriesToStore tvSeries={tvSeries} watched={watched} />;
}
