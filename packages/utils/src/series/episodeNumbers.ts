type CountedSeason = Readonly<{ seasonNumber: number; episodeCount: number }>;
type EpisodeAt = Readonly<{ seasonNumber: number; episodeNumber: number }>;

/**
 * How far TMDB's season count may trail the episodes it names before the
 * show reads as numbered on: a running season's count often lags its newest
 * episode by one or two (S2 lists 8 while E09 has aired). A show numbered on
 * lies a whole earlier season past it.
 */
const COUNT_LAG = 3;

/**
 * The first episode number of each regular season. Most shows start every
 * season at 1, but TMDB numbers some (Naruto Shippuden, One Piece) on across
 * seasons: S2 runs E33…E53. TMDB's details call has no episode numbers per
 * season, so that numbering is read from its last/next episode lying well past
 * its season's count, and each season then starts after the ones before it.
 * When the episodes TMDB names don't fit those ranges, every season starts
 * at 1 again.
 */
export const firstEpisodeNumbers = (
  seasons: ReadonlyArray<CountedSeason>,
  known: Readonly<{ last: EpisodeAt | null; next: EpisodeAt | null }>,
): Record<number, number> => {
  const regular = seasons
    .filter((season) => season.seasonNumber > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
  const perSeason = Object.fromEntries(
    regular.map((season) => [season.seasonNumber, 1]),
  );
  const named = [known.last, known.next].filter(
    (episode): episode is EpisodeAt =>
      episode !== null && episode.seasonNumber > 0,
  );
  const countOf = (seasonNumber: number) =>
    regular.find((season) => season.seasonNumber === seasonNumber)
      ?.episodeCount ?? 0;
  const numberedOn = named.some(
    (episode) =>
      episode.episodeNumber > countOf(episode.seasonNumber) + COUNT_LAG,
  );
  if (!numberedOn) {
    return perSeason;
  }

  const counted: Record<number, number> = {};
  let first = 1;
  for (const season of regular) {
    counted[season.seasonNumber] = first;
    first += season.episodeCount;
  }
  const fits = named.every((episode) => {
    const start = counted[episode.seasonNumber];
    return (
      start !== undefined &&
      episode.episodeNumber >= start &&
      episode.episodeNumber < start + countOf(episode.seasonNumber)
    );
  });
  return fits ? counted : perSeason;
};

/** A season's first episode number: 1 unless TMDB numbers on across seasons */
export const firstEpisodeOf = (
  season: Readonly<{ firstEpisodeNumber?: number }>,
): number => season.firstEpisodeNumber ?? 1;

/** The first `count` episode numbers of a season, in order */
export const episodeNumbersOf = (
  season: Readonly<{ firstEpisodeNumber?: number }>,
  count: number,
): ReadonlyArray<number> => {
  const first = firstEpisodeOf(season);
  return Array.from(
    { length: Math.max(0, count) },
    (_, index) => first + index,
  );
};

/**
 * The episode opens its season: its first real number (1 unless TMDB
 * numbers the show on across seasons; 1 for a season not listed).
 */
export const isSeasonPremiere = (
  episode: EpisodeAt,
  seasons: ReadonlyArray<
    Readonly<{ seasonNumber: number; firstEpisodeNumber?: number }>
  >,
): boolean =>
  episode.episodeNumber ===
  firstEpisodeOf(
    seasons.find((season) => season.seasonNumber === episode.seasonNumber) ??
      {},
  );
