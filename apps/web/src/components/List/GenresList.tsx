import { cacheLife } from 'next/cache';

import { fetchGenresForTvSeries } from '@/lib/api';
import GenreTile from '../Tiles/Genre';
import List from './List';

// Note: override the gap in the list with gap-4 (1rem)
export const gapStyleOverride = {
  '--gap-override': '1rem',
} as React.CSSProperties;

async function cachedGenresForTvSeries() {
  'use cache';
  cacheLife('long');
  return fetchGenresForTvSeries();
}

export default async function GenresList(
  props: React.AllHTMLAttributes<HTMLDivElement>,
) {
  const genres = await cachedGenresForTvSeries();

  const pairedGenres = [];
  for (let i = 0; i < genres.length; i += 2) {
    pairedGenres.push(genres.slice(i, i + 2));
  }

  return (
    <List
      scrollRestoreKey="genres"
      style={gapStyleOverride}
      title="Browse by Genre"
      {...props}
    >
      {pairedGenres.map((pair, index) => (
        <div className="flex flex-col gap-4" key={index}>
          {pair.map((genre) => (
            <GenreTile genre={genre} key={genre.id} />
          ))}
        </div>
      ))}
    </List>
  );
}
