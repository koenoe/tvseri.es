import { cachedWatchedByYear } from '@/lib/cached';
import { getListItems, type ListItem } from '@/lib/db/list';

import Poster from '../Tiles/Poster';

export default async function InProgressByYear({
  priority,
  year,
  userId,
}: Readonly<{ priority?: boolean; year: number; userId: string }>) {
  const [{ items: watchedTvSeries }, watchedItems] = await Promise.all([
    getListItems({
      listId: 'WATCHED',
      userId,
      startDate: new Date(`${year}-01-01`),
      endDate: new Date(`${year}-12-31`),
      options: {
        limit: 100,
      },
    }),
    cachedWatchedByYear({
      userId,
      year,
    }),
  ]);

  const completedIds = watchedTvSeries.map((series) => series.id);

  const items = watchedItems
    .filter((item) => !completedIds.includes(item.seriesId))
    .map(
      (item) =>
        ({
          id: item.seriesId,
          slug: item.slug,
          title: item.title,
          posterImage: item.posterImage,
        }) as ListItem,
    );

  const uniqueItems = [
    ...new Map(items.map((item) => [item.id, item])).values(),
  ];

  return (
    <>
      {uniqueItems.map((item) => (
        <Poster key={item.slug} item={item} priority={priority} size="small" />
      ))}
    </>
  );
}
