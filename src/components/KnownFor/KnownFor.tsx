import Poster from '@/components/Tiles/Poster';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { type ListItem } from '@/lib/db/list';
import { fetchPersonKnownFor } from '@/lib/tmdb';
import { type Movie } from '@/types/movie';
import { type Person } from '@/types/person';
import { type TvSeries } from '@/types/tv-series';

const cachedPersonKnownFor = async (person: Person) => {
  const dynamoCacheKey = `person:known-for:${person.id}`;
  const dynamoCachedItem =
    await getCacheItem<(TvSeries | Movie)[]>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const items = (await fetchPersonKnownFor(person)) as (TvSeries | Movie)[];

  await setCacheItem(dynamoCacheKey, items, {
    ttl: 43200, // 12 hours
  });

  return items;
};

export default async function KnownFor({
  person,
}: Readonly<{
  person: Person;
}>) {
  const knownForItems = await cachedPersonKnownFor(person);

  return (
    <>
      <h2 className="px-[2rem] text-2xl font-medium md:pl-12 lg:pl-16">
        Known for
      </h2>
      <div className="relative flex w-full flex-nowrap gap-4 overflow-x-scroll pb-6 pe-[2rem] ps-[2rem] pt-6 scrollbar-hide md:pe-12 md:ps-12 lg:gap-6 lg:pe-16 lg:ps-16">
        {knownForItems.map((item) => (
          <Poster
            key={item.id}
            item={item as ListItem}
            size="small"
            // TODO: typeguard doesn't work properly, figure out why
            mediaType={!('firstAirDate' in item) ? 'movie' : 'tv'}
          />
        ))}
      </div>
    </>
  );
}
