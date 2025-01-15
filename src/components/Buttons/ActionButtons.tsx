import auth from '@/lib/auth';
import { cachedTvSeries } from '@/lib/cached';
import {
  addToFavorites,
  addToWatchlist,
  isInFavorites,
  isInWatchlist,
  removeFromFavorites,
  removeFromWatchlist,
} from '@/lib/db/list';
import {
  addToOrRemoveFromWatchlist,
  addToOrRemoveFromFavorites,
} from '@/lib/tmdb';
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

    const { user, session } = await auth();
    if (!user || !session) {
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

  const { session } = await auth();
  if (session) {
    const payload = {
      userId: session.userId,
      id: Number(id),
    };

    const isFavorited = await isInFavorites(payload);
    const isWatchlisted = await isInWatchlist(payload);

    return (
      <>
        {shouldShowWatchButton && <WatchButton tvSeriesId={Number(id)} />}
        <LikeButton isActive={isFavorited} action={addToOrRemoveAction} />
        <AddButton isActive={isWatchlisted} action={addToOrRemoveAction} />
      </>
    );
  }

  return (
    <>
      {shouldShowWatchButton && <WatchButton tvSeriesId={Number(id)} />}
      <LikeButton action={addToOrRemoveAction} />
      <AddButton action={addToOrRemoveAction} />
    </>
  );
}
