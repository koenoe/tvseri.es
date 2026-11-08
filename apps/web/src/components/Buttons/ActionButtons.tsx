import type { TvSeries } from '@tvseri.es/schemas';

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

/**
 * The page passes the series it already has, so this doesn't read it again
 * (under a different cache key) just for these fields.
 */
export default async function ActionButtons({
  tvSeries,
  showWatchButton = true,
  showContextMenuButton = true,
}: Readonly<{
  tvSeries: Readonly<Pick<TvSeries, 'hasAired' | 'id' | 'slug'>>;
  showWatchButton?: boolean;
  showContextMenuButton?: boolean;
}>) {
  const tvSeriesId = tvSeries.id;
  const { isFavorited, isWatchlisted } = await fetchListState(tvSeriesId);

  const shouldShowWatchButton = Boolean(showWatchButton && tvSeries.hasAired);
  const contextMenuTvSeries = {
    hasAired: tvSeries.hasAired,
    id: tvSeries.id,
    slug: tvSeries.slug,
  };

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
