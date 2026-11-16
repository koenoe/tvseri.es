import type { Genre, PickItem, TvSeries } from '@tvseri.es/schemas';

/**
 * A TMDB list item (a recommendation, a discover result) carries genre ids
 * without names. Names them from the genre list, and leaves out an id the
 * list doesn't know, so no reason or meta line draws an empty genre (an
 * icon and a lone comma).
 */
export const withGenreNames = (
  series: TvSeries,
  genres: ReadonlyArray<Genre>,
): TvSeries => {
  if (series.genres.every((genre) => genre.name)) {
    return series;
  }
  const byId = new Map(genres.map((genre) => [genre.id, genre]));
  return {
    ...series,
    genres: series.genres.flatMap((genre) => {
      if (genre.name) {
        return [genre];
      }
      const named = byId.get(genre.id);
      return named ? [named] : [];
    }),
  };
};

/** A pick the row can draw: it has a title and a poster */
export const isDrawablePick = (item: PickItem): boolean =>
  item.series.title.trim() !== '' && item.series.posterImage !== '';
