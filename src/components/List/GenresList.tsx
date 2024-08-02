import { fetchGenresForTvSeries } from '@/lib/tmdb';
import GenreTile from '@/components/Tiles/Genre';
import List from './List';

export default async function GenresList() {
  const genres = await fetchGenresForTvSeries();

  const pairedGenres = [];
  for (let i = 0; i < genres.length; i += 2) {
    pairedGenres.push(genres.slice(i, i + 2));
  }

  // Note: override the gap in the list with gap-4 (1rem)
  const style = { '--gap-override': '1rem' } as React.CSSProperties;

  return (
    <List style={style} title="Genres">
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
