import { cookies } from 'next/headers';

import { addToList, isInList, removeFromList } from '@/lib/db/list';
import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import { isTvSeriesWatched } from '@/lib/db/watched';
import { decryptToken } from '@/lib/token';
import { type TvSeries } from '@/types/tv-series';

export default async function ValidateWatchedStatus({
  tvSeries,
}: Readonly<{
  tvSeries: TvSeries;
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

  const isInWatchedList = await isInList({
    userId: user.id,
    listId: 'WATCHED',
    id: tvSeries.id,
  });

  const tvSeriesIsWatched = await isTvSeriesWatched({
    userId: user.id,
    tvSeries,
  });

  if (!isInWatchedList && tvSeriesIsWatched) {
    await addToList({
      userId: user.id,
      listId: 'WATCHED',
      item: {
        id: tvSeries.id,
        title: tvSeries.title,
        slug: tvSeries.slug,
        posterPath: tvSeries.posterPath,
      },
    });
    return null;
  }

  if (!tvSeriesIsWatched) {
    await removeFromList({
      userId: user.id,
      listId: 'WATCHED',
      id: tvSeries.id,
    });
  }

  return null;
}
