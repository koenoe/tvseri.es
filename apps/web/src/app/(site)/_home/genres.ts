type WithGenres = Readonly<{
  genres: ReadonlyArray<Readonly<{ name: string }>>;
}>;

/**
 * The series' genre names that have a name, at most `count`. A series from
 * a TMDB list (recommendations, discover) can carry genre ids without names:
 * those are left out, so a meta line never draws an icon beside an empty
 * value or a lone comma (If you liked Boots).
 */
export const genreNames = (series: WithGenres, count: number): string[] =>
  series.genres
    .map((genre) => genre.name.trim())
    .filter(Boolean)
    .slice(0, count);

/** The first named genre, or '' (a `MetaItem` with '' draws nothing) */
export const firstGenre = (series: WithGenres): string =>
  genreNames(series, 1)[0] ?? '';
