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
      <div className="mb-6 flex items-center gap-x-6">
        <h2 className="text-md lg:text-lg">Watched in {year}</h2>
        <div className="h-[3px] flex-grow bg-white/10" />
      </div>
      <div className="grid grid-cols-4 gap-4 md:grid-cols-6 lg:grid-cols-8 xl:gap-6 2xl:grid-cols-10 [&>*]:!h-full [&>*]:!w-full">
        {items.map((item) => (
          <Poster
            key={item.slug}
            item={item}
            priority={priority}
            size="small"
          />
        ))}
      </div>
    </>
  );
}
