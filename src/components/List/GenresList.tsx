import GenreTile from '@/components/Tiles/Genre';
import { fetchGenresForTvSeries } from '@/lib/tmdb';

import List from './List';

// Note: override the gap in the list with gap-4 (1rem)
export const gapStyleOverride = {
  '--gap-override': '1rem',
} as React.CSSProperties;

export default async function GenresList(
  props: React.AllHTMLAttributes<HTMLDivElement>,
) {
  const genres = await fetchGenresForTvSeries();

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
