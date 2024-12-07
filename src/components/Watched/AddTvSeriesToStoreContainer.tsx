import { cookies } from 'next/headers';

import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import { getAllWatchedForTvSeries } from '@/lib/db/watched';
import { fetchTvSeries } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import AddTvSeriesToStore from './AddTvSeriesToStore';

export default async function AddTvSeriesToStoreContainer({
  id,
}: Readonly<{
  id: number;
}>) {
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return null;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const session = await findSession(decryptedSessionId);

  if (!session) {
    return null;
  }

  const user = await findUser({ userId: session.userId });
  if (!user) {
    return null;
  }

  const tvSeries = await fetchTvSeries(id);

  if (!tvSeries) {
    return null;
  }

  const watched = await getAllWatchedForTvSeries({
    userId: session.userId,
    tvSeries,
  });

  return <AddTvSeriesToStore tvSeries={tvSeries} watched={watched} />;
}
