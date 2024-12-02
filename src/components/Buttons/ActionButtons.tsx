import { cookies } from 'next/headers';

import {
  addToFavorites,
  addToWatchlist,
  isInFavorites,
  isInWatchlist,
  removeFromFavorites,
  removeFromWatchlist,
} from '@/lib/db/list';
import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import {
  addToOrRemoveFromWatchlist,
  addToOrRemoveFromFavorites,
  fetchTvSeries,
} from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';
import { type TvSeries } from '@/types/tv-series';

import AddButton from './AddButton';
import LikeButton from './LikeButton';
import WatchButton from './WatchButton';

export default async function ActionButtons({
  id,
}: Readonly<{
  id: number | string;
}>) {
  async function addToOrRemoveAction(
    value: boolean,
    listType: 'favorites' | 'watchlist',
  ) {
    'use server';

    const cookieStore = await cookies();
    const encryptedSessionId = cookieStore.get('sessionId')?.value;

    if (!encryptedSessionId) {
      return;
    }

    const decryptedSessionId = decryptToken(encryptedSessionId);
    const session = await findSession(decryptedSessionId);

    if (!session) {
      return;
    }

    const user = await findUser({ userId: session.userId });

    if (!user) {
      return;
    }

    const tvSeries = (await fetchTvSeries(id)) as TvSeries;
    const payload = {
      userId: user.id,
      item: {
        id: tvSeries.id,
        posterImage: tvSeries.posterImage,
        slug: tvSeries.slug,
        title: tvSeries.title,
      },
    };

    if (listType === 'watchlist') {
      if (value) {
        await addToWatchlist(payload);
      } else {
        await removeFromWatchlist({
          userId: user.id,
          id: tvSeries.id,
        });
      }
      // Note: we still save the watchlist and favorites to TMDb
      // in case tvseri.es ever stops users will still have their data
      if (session.tmdbSessionId && user.tmdbAccountId) {
        await addToOrRemoveFromWatchlist({
          id,
          accountId: user.tmdbAccountId,
          sessionId: session.tmdbSessionId,
          value,
        });
      }
    } else if (listType === 'favorites') {
      if (value) {
        await addToFavorites(payload);
      } else {
        await removeFromFavorites({
          userId: user.id,
          id: tvSeries.id,
        });
      }
      // Note: we still save the watchlist and favorites to TMDb
      // in case tvseri.es ever stops users will still have their data
      if (session.tmdbSessionId && user.tmdbAccountId) {
        await addToOrRemoveFromFavorites({
          id,
          accountId: user.tmdbAccountId,
          sessionId: session.tmdbSessionId,
          value,
        });
      }
    }
  }

  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (encryptedSessionId) {
    const decryptedSessionId = decryptToken(encryptedSessionId);
    const session = await findSession(decryptedSessionId);

    if (session?.userId) {
      const payload = {
        userId: session.userId,
        id: Number(id),
      };

      const isFavorited = await isInFavorites(payload);
      const isWatchlisted = await isInWatchlist(payload);

      return (
        <>
          <WatchButton />
          <AddButton isActive={isWatchlisted} action={addToOrRemoveAction} />
          <LikeButton isActive={isFavorited} action={addToOrRemoveAction} />
        </>
      );
    }
  }

  return (
    <>
      <WatchButton />
      <AddButton action={addToOrRemoveAction} />
      <LikeButton action={addToOrRemoveAction} />
    </>
  );
}
