import type { TvSeries } from '@tvseri.es/schemas';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import {
  addToFavorites,
  addToWatchlist,
  isInFavorites,
  isInWatchlist,
  removeFromFavorites,
  removeFromWatchlist,
} from '@/lib/api';

import ActionButtonsProvider from './ActionButtonsProvider';
import ContextMenuButtonTvSeries from './ContextMenuButtonTvSeries';
import LikeButton from './LikeButton';
import WatchButton from './WatchButton';
import WatchlistButton from './WatchlistButton';

export default async function ActionButtons({
  id,
  showWatchButton = true,
  showContextMenuButton = true,
}: Readonly<{
  id: number | string;
  showWatchButton?: boolean;
  showContextMenuButton?: boolean;
}>) {
  const tvSeries = (await cachedTvSeries(id)) as TvSeries;
  const shouldShowWatchButton = showWatchButton && tvSeries.hasAired;

  async function addToOrRemoveAction(
    value: boolean,
    listType: 'favorites' | 'watchlist',
  ) {
    'use server';

    const { user, session, encryptedSessionId } = await auth();
    if (!user || !session || !encryptedSessionId) {
      return;
    }

    const payload = {
      item: {
        id: tvSeries.id,
        posterPath: tvSeries.posterPath,
        slug: tvSeries.slug,
        status: tvSeries.status,
        title: tvSeries.title,
      },
      sessionId: encryptedSessionId,
      userId: user.id,
    };

    if (listType === 'watchlist') {
      if (value) {
        await addToWatchlist(payload);
      } else {
        await removeFromWatchlist({
          id: tvSeries.id,
          sessionId: encryptedSessionId,
          userId: user.id,
        });
      }
    } else if (listType === 'favorites') {
      if (value) {
        await addToFavorites(payload);
      } else {
        await removeFromFavorites({
          id: tvSeries.id,
          sessionId: encryptedSessionId,
          userId: user.id,
        });
      }
    }
  }

  const { session } = await auth();
  if (session) {
    const payload = {
      id: Number(id),
      userId: session.userId,
    };

    const [isFavorited, isWatchlisted] = await Promise.all([
      isInFavorites(payload),
      isInWatchlist(payload),
    ]);

    return (
      <ActionButtonsProvider
        isFavorited={isFavorited}
        isWatchlisted={isWatchlisted}
      >
        {shouldShowWatchButton && <WatchButton tvSeriesId={Number(id)} />}
        <LikeButton action={addToOrRemoveAction} />
        <WatchlistButton action={addToOrRemoveAction} />
        {showContextMenuButton && (
          <ContextMenuButtonTvSeries
            action={addToOrRemoveAction}
            tvSeries={tvSeries}
          />
        )}
      </ActionButtonsProvider>
    );
  }

  return (
    <ActionButtonsProvider isFavorited={false} isWatchlisted={false}>
      {shouldShowWatchButton && <WatchButton tvSeriesId={Number(id)} />}
      <LikeButton action={addToOrRemoveAction} />
      <WatchlistButton action={addToOrRemoveAction} />
      {showContextMenuButton && (
        <ContextMenuButtonTvSeries
          action={addToOrRemoveAction}
          tvSeries={tvSeries}
        />
      )}
    </ActionButtonsProvider>
  );
}
