import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import { isInFavorites, isInWatchlist } from '@/lib/api';

import ActionButtonsProvider from './ActionButtonsProvider';
import ContextMenuButtonTvSeries from './ContextMenuButtonTvSeries';
import LikeButton from './LikeButton';
import WatchButton from './WatchButton';
import WatchlistButton from './WatchlistButton';

async function fetchListState(tvSeriesId: number) {
  const { user } = await auth();
  if (!user) {
    return { isFavorited: false, isWatchlisted: false };
  }

  const payload = { id: tvSeriesId, userId: user.id };
  const [isFavorited, isWatchlisted] = await Promise.all([
    isInFavorites(payload),
    isInWatchlist(payload),
  ]);

  return { isFavorited, isWatchlisted };
}

export default async function ActionButtons({
  id,
  showWatchButton = true,
  showContextMenuButton = true,
}: Readonly<{
  id: number | string;
  showWatchButton?: boolean;
  showContextMenuButton?: boolean;
}>) {
  const tvSeriesId = Number(id);
  const [tvSeries, { isFavorited, isWatchlisted }] = await Promise.all([
    cachedTvSeries(id),
    fetchListState(tvSeriesId),
  ]);

  if (!tvSeries) {
    return null;
  }

  const shouldShowWatchButton = Boolean(showWatchButton && tvSeries.hasAired);
  const contextMenuTvSeries = { id: tvSeries.id, slug: tvSeries.slug };

  return (
    <ActionButtonsProvider
      isFavorited={isFavorited}
      isWatchlisted={isWatchlisted}
      tvSeriesId={tvSeriesId}
    >
      {shouldShowWatchButton ? <WatchButton tvSeriesId={tvSeriesId} /> : null}
      <LikeButton />
      <WatchlistButton />
      {showContextMenuButton ? (
        <ContextMenuButtonTvSeries tvSeries={contextMenuTvSeries} />
      ) : null}
    </ActionButtonsProvider>
  );
}
