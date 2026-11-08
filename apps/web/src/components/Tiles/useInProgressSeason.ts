import type { Season } from '@tvseri.es/schemas';

import { useWatchedStore } from '../Watched/WatchedStoreProvider';

type InProgressSeason = Readonly<{
  currentSeason: Season;
  watchCount: number;
}>;

/**
 * The tile's season and progress. Uses the watched store when it's seeded with
 * the viewer's own data (`isOwner`), so marks update the tile live; otherwise
 * the server-rendered values. Once everything aired is watched, the last
 * season is shown as finished.
 */
export default function useInProgressSeason(
  tvSeriesId: number,
  serverValue: InProgressSeason,
  isOwner: boolean,
): InProgressSeason {
  const isReady = useWatchedStore((store) => store.isReady(tvSeriesId));
  const currentSeason = useWatchedStore(
    (store) => store.getCurrentSeason(tvSeriesId).currentSeason,
  );
  const watchCount = useWatchedStore(
    (store) => store.getCurrentSeason(tvSeriesId).watchCount,
  );

  if (!isOwner || !isReady) {
    return serverValue;
  }

  if (!currentSeason) {
    const season = serverValue.currentSeason;
    return {
      currentSeason: season,
      watchCount: season.numberOfAiredEpisodes || season.numberOfEpisodes || 0,
    };
  }

  return { currentSeason, watchCount };
}
