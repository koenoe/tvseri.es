import dynamic from 'next/dynamic';

import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { fetchGenresForTvSeries } from '@/lib/tmdb';
import { type Genre } from '@/types/genre';

import List from './List';

const GenreTile = dynamic(() => import('@/components/Tiles/Genre'));

// Note: override the gap in the list with gap-4 (1rem)
export const gapStyleOverride = {
  '--gap-override': '1rem',
} as React.CSSProperties;

const cachedItems = async () => {
  const dynamoCacheKey = 'genres';
  const dynamoCachedItem = await getCacheItem<Genre[]>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const items = await fetchGenresForTvSeries();

  await setCacheItem(dynamoCacheKey, items, {
    ttl: 31536000, // 1 year
  });

  return items;
};

export default async function GenresList(
  props: React.AllHTMLAttributes<HTMLDivElement>,
) {
  const genres = await cachedItems();

  const pairedGenres = [];
  for (let i = 0; i < genres.length; i += 2) {
    pairedGenres.push(genres.slice(i, i + 2));
  }

  return (
    <List
      style={gapStyleOverride}
      title="Genres"
      scrollRestoreKey="genres"
      {...props}
    >
      {pairedGenres.map((pair, index) => (
        <div key={index} className="flex flex-col gap-4">
          {pair.map((genre) => (
            <GenreTile key={genre.id} genre={genre} />
          ))}
        </div>
      ))}
    </List>
  );
}
