import { getStatsWatchedSeries } from '@/lib/api';

import type { PosterItem } from '@/utils/toPosterItem';
import Poster from '../Tiles/Poster';
import { statsGridItemSizes } from './Grid';

export default async function WatchedByYear({
  year,
  userId,
}: Readonly<{ year: number; userId: string }>) {
  const items = await getStatsWatchedSeries({ userId, year });

  return (
    <>
      {items.map((item) => (
        <Poster
          item={item as PosterItem}
          key={item.id}
          size="small"
          sizes={statsGridItemSizes}
        />
      ))}
    </>
  );
}
