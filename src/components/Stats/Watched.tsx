import { cachedWatchedByYearFromList } from '@/lib/cached';

import Poster from '../Tiles/Poster';

export default async function WatchedByYear({
  priority,
  year,
  userId,
}: Readonly<{ priority?: boolean; year: number; userId: string }>) {
  const items = await cachedWatchedByYearFromList({ userId, year });

  return (
    <>
      {items.map((item) => (
        <Poster key={item.slug} item={item} priority={priority} size="small" />
      ))}
    </>
  );
}
