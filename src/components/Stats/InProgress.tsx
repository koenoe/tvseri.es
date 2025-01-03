import { cachedWatchedByYear } from '@/lib/cached';
import { getAllListItems, type ListItem } from '@/lib/db/list';

import Poster from '../Tiles/Poster';

export default async function InProgressByYear({
  priority,
  year,
  userId,
}: Readonly<{ priority?: boolean; year: number; userId: string }>) {
  const [watchedTvSeries, watchedItems] = await Promise.all([
    getAllListItems({
      listId: 'WATCHED',
      userId,
      startDate: new Date('1970-01-01'),
      endDate: new Date(`${year}-12-31`),
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
