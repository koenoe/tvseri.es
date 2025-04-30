import { connection } from 'next/server';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
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

import ActionButtonsProvider from './ActionButtonsProvider';
import AddButton from './AddButton';
import ContextMenuButtonTvSeries from './ContextMenuButtonTvSeries';
import LikeButton from './LikeButton';
import WatchButton from './WatchButton';

export default async function ActionButtons({
  id,
  showWatchButton = true,
  showContextMenuButton = true,
}: Readonly<{
  id: number | string;
  showWatchButton?: boolean;
  showContextMenuButton?: boolean;
}>) {
  await connection();

  const tvSeries = (await cachedTvSeries(id)) as TvSeries;
  const shouldShowWatchButton =
    showWatchButton && new Date(tvSeries.firstAirDate) <= new Date();

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
        status: tvSeries.status,
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
      <ActionButtonsProvider
        isFavorited={isFavorited}
        isWatchlisted={isWatchlisted}
      >
        {shouldShowWatchButton && <WatchButton tvSeriesId={Number(id)} />}
        <LikeButton action={addToOrRemoveAction} />
        <AddButton action={addToOrRemoveAction} />
        {showContextMenuButton && (
          <ContextMenuButtonTvSeries
            tvSeries={tvSeries}
            action={addToOrRemoveAction}
          />
        )}
      </ActionButtonsProvider>
    );
  }

  return (
    <ActionButtonsProvider isFavorited={false} isWatchlisted={false}>
      {shouldShowWatchButton && <WatchButton tvSeriesId={Number(id)} />}
      <LikeButton action={addToOrRemoveAction} />
      <AddButton action={addToOrRemoveAction} />
      {showContextMenuButton && (
        <ContextMenuButtonTvSeries
          tvSeries={tvSeries}
          action={addToOrRemoveAction}
        />
      )}
    </ActionButtonsProvider>
  );
}
