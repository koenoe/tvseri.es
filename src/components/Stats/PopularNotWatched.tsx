import { cache } from 'react';

import { unstable_cache } from 'next/cache';

import List, { type HeaderVariantProps } from '@/components/List/List';
import { fetchPopularTvSeriesByYear } from '@/lib/tmdb';

import Poster from '../Tiles/Poster';

const cachedPopularNotWatched = cache(async (year: number) =>
  unstable_cache(
    async () => {
      // TODO: filter out watched items obviously
      const items = await fetchPopularTvSeriesByYear(year);
      return items;
    },
    ['top-year', year.toString()],
    {
      revalidate: 604800, // 1 week
    },
  )(),
);

export default async function PopularNotWatched({
  priority,
  year,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  HeaderVariantProps &
  Readonly<{ priority?: boolean; year: number }>) {
  const tvSeries = await cachedPopularNotWatched(year);

  return (
    <List
      title={<h2 className="text-md lg:text-lg">Missed in {year}</h2>}
      scrollRestoreKey="top-rated-shows-unwatched"
      scrollBarClassName="h-[3px] rounded-none"
      {...rest}
    >
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} priority={priority} size="small" />
      ))}
    </List>
  );
}
