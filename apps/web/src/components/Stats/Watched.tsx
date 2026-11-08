import { getStatsWatchedSeries } from '@/lib/api';

import type { PosterItem } from '@/utils/toPosterItem';
import Poster from '../Tiles/Poster';

export default async function WatchedByYear({
  priority,
  year,
  userId,
}: Readonly<{ priority?: boolean; year: number; userId: string }>) {
  const items = await getStatsWatchedSeries({ userId, year });

  return (
    <>
      {items.map((item) => (
        <Poster
          item={item as PosterItem}
          key={item.id}
          priority={priority}
          size="small"
        />
      ))}
    </>
  );
}
