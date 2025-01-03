import { cookies } from 'next/headers';

import { cachedTvSeries } from '@/lib/cached';
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
  const tvSeries = (await cachedTvSeries(id)) as TvSeries;
  const shouldShowWatchButton = new Date(tvSeries.firstAirDate) <= new Date();

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

    const payload = {
      userId: user.id,
      item: {
        id: tvSeries.id,
        posterPath: tvSeries.posterPath,
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
      if (
        process.env.NODE_ENV === 'production' &&
        session.tmdbSessionId &&
        user.tmdbAccountId
      ) {
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
      if (
        process.env.NODE_ENV === 'production' &&
        session.tmdbSessionId &&
        user.tmdbAccountId
      ) {
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
          <AddButton isActive={isWatchlisted} action={addToOrRemoveAction} />
          {shouldShowWatchButton && <WatchButton tvSeriesId={Number(id)} />}
          <LikeButton isActive={isFavorited} action={addToOrRemoveAction} />
        </>
      );
    }
  }

  return (
    <>
      <AddButton action={addToOrRemoveAction} />
      {shouldShowWatchButton && <WatchButton tvSeriesId={Number(id)} />}
      <LikeButton action={addToOrRemoveAction} />
    </>
  );
}
