import type { ListItem, User } from '@tvseri.es/schemas';
import { cachedTvSeries } from '@/app/cached';
import { getAllWatchedForTvSeries } from '@/lib/api';
import getCurrentSeason from '@/utils/getCurrentSeason';
import AddTvSeriesToStore from '../Watched/AddTvSeriesToStore';
import { toWatchedItemForStore } from '../Watched/store';
import { toWatchedStoreTvSeries } from '../Watched/toWatchedStoreTvSeries';
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

  if (!currentSeason) {
    return null;
  }

  // Only the owner's own data goes into the watched store, so their marks
  // update the tile live (and other people's profiles never pollute it).
  const watchedForStore = isOwner
    ? watchedItems.map(toWatchedItemForStore)
    : null;

  return (
    <>
      {watchedForStore ? (
        <AddTvSeriesToStore
          tvSeries={toWatchedStoreTvSeries(tvSeries)}
          watched={watchedForStore}
        />
      ) : null}
      <InProgress
        currentSeason={currentSeason}
        currentSeasonWatchCount={watchCount}
        removeIsAllowed={isOwner}
        tvSeries={tvSeries}
      />
    </>
  );
}
