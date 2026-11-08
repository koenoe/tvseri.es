import type { ListItem, User } from '@tvseri.es/schemas';
import { cachedTvSeries } from '@/app/cached';
import { getWatchedProgressForTvSeries } from '@/lib/api';
import getCurrentSeason from '@/utils/getCurrentSeason';
import { toSpotlightTvSeries } from '@/utils/toSpotlightTvSeries';
import AddTvSeriesToStore from '../Watched/AddTvSeriesToStore';
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
    getWatchedProgressForTvSeries({
      seriesId: item.id,
      userId: user.id,
    }),
  ]);

  if (!tvSeries) {
    return null;
  }

  const storeTvSeries = toWatchedStoreTvSeries(tvSeries);
  // currentSeason is a reference into storeTvSeries.seasons, so when both go
  // to the client it's serialised once
  const { currentSeason, watchCount } = getCurrentSeason(
    watchedItems,
    storeTvSeries.seasons ?? [],
  );

  if (!currentSeason) {
    return null;
  }

  const spotlightTvSeries = toSpotlightTvSeries(tvSeries);

  // Only the owner's own data goes into the watched store, so their marks
  // update the tile live (and other people's profiles never pollute it).
  return (
    <>
      {isOwner ? (
        <AddTvSeriesToStore tvSeries={storeTvSeries} watched={watchedItems} />
      ) : null}
      <InProgress
        currentSeason={currentSeason}
        currentSeasonWatchCount={watchCount}
        removeIsAllowed={isOwner}
        tvSeries={spotlightTvSeries}
      />
    </>
  );
}
