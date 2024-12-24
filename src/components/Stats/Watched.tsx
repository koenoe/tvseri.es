import { getListItems } from '@/lib/db/list';

import Poster from '../Tiles/Poster';

export default async function WatchedByYear({
  priority,
  year,
  userId,
}: Readonly<{ priority?: boolean; year: number; userId: string }>) {
  const { items } = await getListItems({
    listId: 'WATCHED',
    userId,
    startDate: new Date(`${year}-01-01`),
    endDate: new Date(`${year}-12-31`),
    options: {
      limit: 100,
    },
  });

  return (
    <>
      {items.map((item) => (
        <Poster key={item.slug} item={item} priority={priority} size="small" />
      ))}
    </>
  );
}
