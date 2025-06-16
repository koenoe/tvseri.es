import type { ListItem } from '@tvseri.es/types';

import { cachedUniqueWatchedByYear } from '@/app/cached';

import Poster from '../Tiles/Poster';

export default async function WatchedByYear({
  priority,
  year,
  userId,
}: Readonly<{ priority?: boolean; year: number; userId: string }>) {
  const items = await cachedUniqueWatchedByYear({ userId, year });

  return (
    <>
      {items.map((item) => (
        <Poster
          key={item.slug}
          item={item as ListItem}
          priority={priority}
          size="small"
        />
      ))}
    </>
  );
}
