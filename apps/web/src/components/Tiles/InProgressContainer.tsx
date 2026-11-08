import type { ListItem, User } from '@tvseri.es/schemas';
import { cachedTvSeries } from '@/app/cached';
import { getAllWatchedForTvSeries } from '@/lib/api';
import getCurrentSeason from '@/utils/getCurrentSeason';
import InProgress from './InProgress';

export default async function InProgressContainer({
  isOwner,
  item,
  user,
}: Readonly<{
  isOwner: boolean;
  item: ListItem;
  user: User;
}>) {
  const [tvSeries, watchedItems] = await Promise.all([
    cachedTvSeries(item.id, { includeImages: true }),
    getAllWatchedForTvSeries({
      seriesId: item.id,
      userId: user.id,
    }),
  ]);

  if (!tvSeries) {
    return null;
  }

  const { currentSeason, watchCount } = getCurrentSeason(
    watchedItems,
    tvSeries.seasons ?? [],
  );

  return currentSeason ? (
    <InProgress
      currentSeason={currentSeason}
      currentSeasonWatchCount={watchCount}
      removeIsAllowed={isOwner}
      tvSeries={tvSeries}
    />
  ) : null;
}
