import type { ListItem, Person } from '@tvseri.es/schemas';

import Poster from '@/components/Tiles/Poster';
import { fetchPersonKnownFor } from '@/lib/api';

export default async function KnownFor({
  personId,
}: Readonly<{
  personId: Person['id'];
}>) {
  const knownForItems = await fetchPersonKnownFor(personId);

  return (
    <>
      <h2 className="px-[2rem] text-2xl font-medium md:pl-12 lg:pl-16">
        Known for
      </h2>
      <div className="scrollbar-hide relative flex w-full flex-nowrap gap-4 overflow-x-scroll pb-6 pe-[2rem] ps-[2rem] pt-6 md:pe-12 md:ps-12 lg:gap-6 lg:pe-16 lg:ps-16">
        {knownForItems.map((item) => (
          <Poster
            item={item as ListItem}
            key={item.id}
            mediaType={!('firstAirDate' in item) ? 'movie' : 'tv'}
            // TODO: typeguard doesn't work properly, figure out why
            size="small"
          />
        ))}
      </div>
    </>
  );
}
